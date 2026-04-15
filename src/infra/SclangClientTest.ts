import { Effect, Layer, Ref } from "effect";
import { ServerNotRunningError } from "../domain/errors.ts";
import { EvalResult, LoadResult, NodeInfo, ServerStatus, SynthDefInfo } from "../domain/models.ts";
import { SclangClient } from "../domain/SclangClient.ts";

export const SclangClientTest = Layer.effect(
  SclangClient,
  Effect.gen(function* () {
    const evalLogRef = yield* Ref.make<string[]>([]);
    const serverBooted = yield* Ref.make(false);
    const cannedEvals = yield* Ref.make<Map<string, string>>(new Map());

    const mockEval = (code: string) =>
      Effect.gen(function* () {
        yield* Ref.update(evalLogRef, (log) => [...log, code]);
        const canned = yield* Ref.get(cannedEvals);
        const result = canned.get(code) ?? "nil";
        return new EvalResult({ code, result, stdout: [] });
      });

    return SclangClient.of({
      eval: (code) => mockEval(code),

      boot: () =>
        Effect.gen(function* () {
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
          const booted = yield* Ref.get(serverBooted);
          if (!booted) {
            return yield* Effect.fail(
              new ServerNotRunningError({ message: "SC server not booted" }),
            );
          }
          return new ServerStatus({
            running: true,
            numSynths: 0,
            numGroups: 1,
            numUGens: 0,
            avgCPU: 0.5,
            peakCPU: 1.2,
            sampleRate: 44100,
          });
        }),

      freeAll: () =>
        Effect.gen(function* () {
          const booted = yield* Ref.get(serverBooted);
          if (!booted) {
            return yield* Effect.fail(
              new ServerNotRunningError({ message: "SC server not booted" }),
            );
          }
        }),

      loadFile: (path) => Effect.succeed(new LoadResult({ path, result: "nil" })),

      listSynthDefs: () =>
        Effect.gen(function* () {
          const booted = yield* Ref.get(serverBooted);
          if (!booted) {
            return yield* Effect.fail(
              new ServerNotRunningError({ message: "SC server not booted" }),
            );
          }
          return [new SynthDefInfo({ name: "default" })];
        }),

      nodeTree: () =>
        Effect.gen(function* () {
          const booted = yield* Ref.get(serverBooted);
          if (!booted) {
            return yield* Effect.fail(
              new ServerNotRunningError({ message: "SC server not booted" }),
            );
          }
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
