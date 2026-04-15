import type { Cause, Effect, ManagedRuntime } from "effect";
import { Cause as CauseModule } from "effect";
import type {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "../domain/errors.ts";
import type { SclangClient } from "../domain/SclangClient.ts";

export type SclangErrors =
  | SclangEvalError
  | SclangSpawnError
  | SclangTimeoutError
  | ServerNotRunningError;

export type SclangRuntime = ManagedRuntime.ManagedRuntime<SclangClient, SclangErrors>;

export const formatSuccess = (data: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(data, null, 2),
    },
  ],
});

export const formatError = (cause: Cause.Cause<unknown>) => ({
  content: [
    {
      type: "text" as const,
      text: `Error: ${CauseModule.pretty(cause)}`,
    },
  ],
  isError: true as const,
});

export const runTool = async <A>(
  runtime: SclangRuntime,
  effect: Effect.Effect<A, SclangErrors, SclangClient>,
) => {
  const result = await runtime.runPromiseExit(effect);
  if (result._tag === "Failure") return formatError(result.cause);
  return formatSuccess(result.value);
};
