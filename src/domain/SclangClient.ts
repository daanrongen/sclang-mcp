import { Context, type Effect } from "effect";
import type {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "./errors.ts";
import type { EvalResult, LoadResult, NodeInfo, ServerStatus, SynthDefInfo } from "./models.ts";

type EvalErrors = SclangEvalError | SclangTimeoutError;
type ServerErrors = EvalErrors | ServerNotRunningError;

export interface SclangClientService {
  readonly eval: (code: string, timeoutMs?: number) => Effect.Effect<EvalResult, EvalErrors>;
  readonly boot: () => Effect.Effect<ServerStatus, SclangSpawnError | EvalErrors>;
  readonly serverStatus: () => Effect.Effect<ServerStatus, ServerErrors>;
  readonly freeAll: () => Effect.Effect<void, ServerErrors>;
  readonly loadFile: (path: string) => Effect.Effect<LoadResult, EvalErrors>;
  readonly listSynthDefs: () => Effect.Effect<SynthDefInfo[], ServerErrors>;
  readonly nodeTree: () => Effect.Effect<NodeInfo, ServerErrors>;
}

export class SclangClient extends Context.Tag("SclangClient")<
  SclangClient,
  SclangClientService
>() {}
