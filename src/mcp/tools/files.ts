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

export const registerFileTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<SclangClient, SclangErrors>,
) => {
  server.tool(
    "load_file",
    "Load and evaluate a SuperCollider .scd file from disk.",
    {
      path: z.string().describe("Absolute or relative path to the .scd file to evaluate"),
    },
    {
      title: "Load SC File",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    async ({ path }) => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.loadFile(path);
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );
};
