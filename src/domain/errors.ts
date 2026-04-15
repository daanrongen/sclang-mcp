import { Data } from "effect";

export class SclangSpawnError extends Data.TaggedError("SclangSpawnError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export class SclangEvalError extends Data.TaggedError("SclangEvalError")<{
  readonly code: string;
  readonly message: string;
}> {}

export class SclangTimeoutError extends Data.TaggedError("SclangTimeoutError")<{
  readonly code: string;
  readonly timeoutMs: number;
}> {}

export class ServerNotRunningError extends Data.TaggedError("ServerNotRunningError")<{
  readonly message: string;
}> {}
