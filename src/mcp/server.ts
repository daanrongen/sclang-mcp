import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ManagedRuntime } from "effect";
import type {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "../domain/errors.ts";
import type { SclangClient } from "../domain/SclangClient.ts";
import { registerEvalTools } from "./tools/eval.ts";
import { registerFileTools } from "./tools/files.ts";
import { registerServerTools } from "./tools/server-tools.ts";

type SclangErrors = SclangEvalError | SclangSpawnError | SclangTimeoutError | ServerNotRunningError;

export const createMcpServer = (
  runtime: ManagedRuntime.ManagedRuntime<SclangClient, SclangErrors>,
): McpServer => {
  const server = new McpServer({
    name: "sclang-mcp-server",
    version: "1.0.0",
  });

  registerEvalTools(server, runtime);
  registerServerTools(server, runtime);
  registerFileTools(server, runtime);

  return server;
};
