import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEvalTools } from "./tools/eval.ts";
import { registerFileTools } from "./tools/files.ts";
import { registerServerTools } from "./tools/server-tools.ts";
import type { SclangRuntime } from "./utils.ts";

export const createMcpServer = (runtime: SclangRuntime): McpServer => {
  const server = new McpServer({
    name: "sclang-mcp-server",
    version: "1.0.0",
  });

  registerEvalTools(server, runtime);
  registerServerTools(server, runtime);
  registerFileTools(server, runtime);

  return server;
};
