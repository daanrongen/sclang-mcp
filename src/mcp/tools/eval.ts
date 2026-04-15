import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import { z } from "zod";
import type {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "../../domain/errors.ts";
import { SclangClient } from "../../domain/SclangClient.ts";
import { formatError, formatSuccess } from "../utils.ts";

type SclangErrors = SclangEvalError | SclangSpawnError | SclangTimeoutError | ServerNotRunningError;

export const registerEvalTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<SclangClient, SclangErrors>,
) => {
  server.tool(
    "eval",
    "Evaluate SuperCollider code in the running sclang interpreter and return the result.",
    {
      code: z.string().describe("SuperCollider code to evaluate"),
      timeoutMs: z
        .number()
        .int()
        .min(100)
        .max(60000)
        .default(10000)
        .describe("Evaluation timeout in milliseconds (default 10s)"),
    },
    {
      title: "Evaluate SC Code",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ code, timeoutMs }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.eval(code, timeoutMs);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );
};
