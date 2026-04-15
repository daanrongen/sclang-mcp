import { type ChildProcess, spawn } from "node:child_process";
import { Deferred, Effect, Layer, Option, Ref } from "effect";
import { SclangConfig } from "../config.ts";
import {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "../domain/errors.ts";
import { EvalResult, LoadResult, NodeInfo, ServerStatus, SynthDefInfo } from "../domain/models.ts";
import { SclangClient } from "../domain/SclangClient.ts";

const DEFAULT_TIMEOUT_MS = 10_000;
const BOOT_TIMEOUT_MS = 30_000;

/**
 * Parse the stdout output of s.queryAllNodes(true) into a NodeInfo tree.
 *
 * SuperCollider prints lines like:
 *   NODE TREE Group 0
 *      1 group
 *         1000 default
 *           out: 0, freq: 440
 *
 * Indentation (3 spaces per level) encodes the hierarchy.
 * Lines starting with a digit are nodes; all others are ignored.
 */
function parseNodeTree(lines: readonly string[]): NodeInfo {
  // Find the header line to determine root id
  const headerLine = lines.find((l) => l.trimStart().startsWith("NODE TREE Group "));
  const rootId = headerLine ? parseInt(headerLine.replace(/.*NODE TREE Group /, ""), 10) : 0;

  // Collect only node lines (lines whose trimmed form starts with a digit)
  const nodeLines = lines.filter((l) => /^\s*\d+\s+\S/.test(l));

  if (nodeLines.length === 0) {
    return new NodeInfo({ id: rootId, type: "group", name: "RootNode", children: [] });
  }

  // Parse each node line into { indent, id, name }
  const parsed = nodeLines.map((line) => {
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trimStart();
    const spaceIdx = trimmed.indexOf(" ");
    const id = parseInt(trimmed.slice(0, spaceIdx), 10);
    const name = trimmed.slice(spaceIdx + 1).trim();
    return { indent, id, name };
  });

  // Build tree recursively; indentation (3 spaces per level) encodes parent-child relationships
  const buildNode = (idx: number): NodeInfo => {
    const entry = parsed[idx];
    if (entry === undefined) {
      return new NodeInfo({ id: 0, type: "group", name: "RootNode", children: [] });
    }
    const { id, name, indent: currentIndent } = entry;
    const type: "synth" | "group" = name === "group" ? "group" : "synth";

    if (type === "group") {
      const children: NodeInfo[] = [];
      let i = idx + 1;
      while (i < parsed.length) {
        const child = parsed[i];
        if (child === undefined || child.indent <= currentIndent) break;
        // Only process direct children (next indent level)
        if (child.indent === currentIndent + 3) {
          children.push(buildNode(i));
        }
        i++;
      }
      return new NodeInfo({ id, type: "group", name: String(id), children });
    }

    return new NodeInfo({ id, type: "synth", name });
  };

  const first = parsed[0];
  if (first?.name === "group" && first.id === rootId) {
    return buildNode(0);
  }

  // Root is the conceptual node 0 containing all top-level nodes
  const topIndent = first?.indent ?? 0;
  const children: NodeInfo[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const entry = parsed[i];
    if (entry?.indent === topIndent) {
      children.push(buildNode(i));
    }
  }
  return new NodeInfo({ id: rootId, type: "group", name: "RootNode", children });
}

interface PendingEval {
  readonly deferred: Deferred.Deferred<EvalResult, SclangEvalError | SclangTimeoutError>;
  readonly code: string;
  readonly stdoutLines: string[];
}

export const SclangClientLive = Layer.scoped(
  SclangClient,
  Effect.gen(function* () {
    const sclangPath = yield* Effect.orDie(SclangConfig.path);
    const sclangConf = yield* Effect.orDie(SclangConfig.conf);
    const serverBooted = yield* Ref.make(false);
    const pendingRef = yield* Ref.make<PendingEval | null>(null);
    const stdoutBuf = yield* Ref.make("");
    // Mutex: sclang is single-threaded and can only process one eval at a time.
    // Serialising concurrent callers prevents pendingRef from being overwritten
    // before the first caller's Deferred resolves.
    const evalMutex = yield* Effect.makeSemaphore(1);

    const args: string[] = ["-i", "sclang-mcp"];
    if (Option.isSome(sclangConf)) {
      args.push("-l", sclangConf.value);
    }

    const proc = yield* Effect.acquireRelease(
      Effect.async<ChildProcess, SclangSpawnError>((resume) => {
        const child = spawn(sclangPath, args, {
          env: { ...process.env, QT_QPA_PLATFORM: "offscreen" },
        });
        child.on("error", (err) =>
          resume(
            Effect.fail(new SclangSpawnError({ message: "Failed to spawn sclang", cause: err })),
          ),
        );
        child.on("spawn", () => resume(Effect.succeed(child)));
      }),
      (child) =>
        Effect.sync(() => {
          child.stdin?.end();
          child.kill("SIGTERM");
        }),
    );

    // Wire stdout: accumulate lines, resolve pending deferred on result/error
    proc.stdout?.on("data", (chunk: Buffer) => {
      void Effect.runPromise(
        Effect.gen(function* () {
          const accumulated = yield* Ref.get(stdoutBuf);
          const combined = accumulated + chunk.toString("utf8");
          const lines = combined.split("\n");
          const incomplete = lines.pop() ?? "";
          yield* Ref.set(stdoutBuf, incomplete);

          const pending = yield* Ref.get(pendingRef);
          if (pending === null) return;

          for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx];
            if (line === undefined) continue;
            if (line.startsWith("-> ")) {
              const resultValue = line.slice(3).trim();
              const evalResult = new EvalResult({
                code: pending.code,
                result: resultValue,
                stdout: [...pending.stdoutLines, ...lines.slice(0, lineIdx)],
              });
              yield* Deferred.succeed(pending.deferred, evalResult);
              yield* Ref.set(pendingRef, null);
              return;
            }
            if (line.includes("ERROR:") || line.startsWith("error:")) {
              yield* Deferred.fail(
                pending.deferred,
                new SclangEvalError({ code: pending.code, message: line }),
              );
              yield* Ref.set(pendingRef, null);
              return;
            }
          }
          // Accumulate stdout lines into pending
          if (lines.length > 0) {
            yield* Ref.set(pendingRef, {
              ...pending,
              stdoutLines: [...pending.stdoutLines, ...lines],
            });
          }
        }),
      );
    });

    const evalCode = (code: string, timeoutMs: number) =>
      Effect.gen(function* () {
        const deferred = yield* Deferred.make<EvalResult, SclangEvalError | SclangTimeoutError>();
        yield* Ref.set(pendingRef, { deferred, code, stdoutLines: [] });
        yield* Effect.sync(() => proc.stdin?.write(`${code}\x0c`));

        return yield* Deferred.await(deferred).pipe(
          Effect.timeoutFail({
            duration: timeoutMs,
            onTimeout: () => new SclangTimeoutError({ code, timeoutMs }),
          }),
          Effect.tap(() => Ref.set(pendingRef, null)),
          Effect.tapError(() => Ref.set(pendingRef, null)),
        );
      }).pipe(evalMutex.withPermits(1));

    const requireBooted = Effect.gen(function* () {
      const booted = yield* Ref.get(serverBooted);
      if (!booted) {
        return yield* Effect.fail(new ServerNotRunningError({ message: "SC server not booted" }));
      }
    });

    return SclangClient.of({
      eval: (code, timeoutMs = DEFAULT_TIMEOUT_MS) => evalCode(code, timeoutMs),

      boot: () =>
        Effect.gen(function* () {
          yield* evalCode('s.waitForBoot { "__BOOTED__".postln }', BOOT_TIMEOUT_MS);
          yield* Ref.set(serverBooted, true);
          const result = yield* evalCode(
            "[s.numSynths, s.numGroups, s.numUGens, s.avgCPU, s.peakCPU, s.sampleRate]",
            DEFAULT_TIMEOUT_MS,
          );
          const nums = result.result
            .replace(/[[\]\s]/g, "")
            .split(",")
            .map(Number);
          return new ServerStatus({
            running: true,
            numSynths: nums[0] ?? 0,
            numGroups: nums[1] ?? 0,
            numUGens: nums[2] ?? 0,
            avgCPU: nums[3] ?? 0,
            peakCPU: nums[4] ?? 0,
            sampleRate: nums[5] ?? 44100,
          });
        }),

      serverStatus: () =>
        Effect.gen(function* () {
          yield* requireBooted;
          const result = yield* evalCode(
            "[s.numSynths, s.numGroups, s.numUGens, s.avgCPU, s.peakCPU, s.sampleRate]",
            DEFAULT_TIMEOUT_MS,
          );
          const nums = result.result
            .replace(/[[\]\s]/g, "")
            .split(",")
            .map(Number);
          return new ServerStatus({
            running: true,
            numSynths: nums[0] ?? 0,
            numGroups: nums[1] ?? 0,
            numUGens: nums[2] ?? 0,
            avgCPU: nums[3] ?? 0,
            peakCPU: nums[4] ?? 0,
            sampleRate: nums[5] ?? 44100,
          });
        }),

      freeAll: () =>
        Effect.gen(function* () {
          yield* requireBooted;
          yield* evalCode("s.freeAll", DEFAULT_TIMEOUT_MS);
        }),

      loadFile: (path) =>
        Effect.gen(function* () {
          yield* requireBooted;
          const result = yield* evalCode(`"${path.replace(/"/g, '\\"')}".load`, DEFAULT_TIMEOUT_MS);
          return new LoadResult({ path, result: result.result });
        }),

      listSynthDefs: () =>
        Effect.gen(function* () {
          yield* requireBooted;
          const result = yield* evalCode(
            "SynthDescLib.global.synthDescs.keys.asArray.sort",
            DEFAULT_TIMEOUT_MS,
          );
          const names = result.result
            .replace(/[[\]]/g, "")
            .split(",")
            .map((s) => s.trim().replace(/^'|'$/g, ""))
            .filter(Boolean);
          return names.map((name) => new SynthDefInfo({ name }));
        }),

      nodeTree: () =>
        Effect.gen(function* () {
          yield* requireBooted;
          const result = yield* evalCode("s.queryAllNodes(true)", DEFAULT_TIMEOUT_MS);
          return parseNodeTree(result.stdout);
        }),
    });
  }),
);
