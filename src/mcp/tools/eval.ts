import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { SclangClient } from "../../domain/SclangClient.ts";
import { runTool, type SclangRuntime } from "../utils.ts";

export const registerEvalTools = (server: McpServer, runtime: SclangRuntime) => {
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
    ({ code, timeoutMs }) =>
      runTool(
        runtime,
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.eval(code, timeoutMs);
        }),
      ),
  );
};
