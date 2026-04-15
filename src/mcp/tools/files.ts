import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect } from "effect";
import { z } from "zod";
import { SclangClient } from "../../domain/SclangClient.ts";
import { runTool, type SclangRuntime } from "../utils.ts";

export const registerFileTools = (server: McpServer, runtime: SclangRuntime) => {
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
    ({ path }) =>
      runTool(
        runtime,
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.loadFile(path);
        }),
      ),
  );
};
