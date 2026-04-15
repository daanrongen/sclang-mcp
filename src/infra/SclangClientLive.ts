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

          for (const line of lines) {
            if (line.startsWith("-> ")) {
              const resultValue = line.slice(3).trim();
              const evalResult = new EvalResult({
                code: pending.code,
                result: resultValue,
                stdout: [...pending.stdoutLines, ...lines],
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
      });

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
          return new ServerStatus({
            running: true,
            numSynths: 0,
            numGroups: 1,
            numUGens: 0,
            avgCPU: 0,
            peakCPU: 0,
            sampleRate: 44100,
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
          yield* evalCode("s.queryAllNodes(true)", DEFAULT_TIMEOUT_MS);
          return new NodeInfo({
            id: 0,
            type: "group",
            name: "RootNode",
            children: [],
          });
        }),
    });
  }),
);
