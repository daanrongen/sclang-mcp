import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Effect, type ManagedRuntime } from "effect";
import type {
  SclangEvalError,
  SclangSpawnError,
  SclangTimeoutError,
  ServerNotRunningError,
} from "../../domain/errors.ts";
import { SclangClient } from "../../domain/SclangClient.ts";
import { formatError, formatSuccess } from "../utils.ts";

type SclangErrors = SclangEvalError | SclangSpawnError | SclangTimeoutError | ServerNotRunningError;

export const registerServerTools = (
  server: McpServer,
  runtime: ManagedRuntime.ManagedRuntime<SclangClient, SclangErrors>,
) => {
  server.tool(
    "boot",
    "Boot the SuperCollider audio server (scsynth) and wait until it is ready.",
    {},
    {
      title: "Boot SC Server",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async () => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.boot();
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );

  server.tool(
    "server_status",
    "Query current SuperCollider server status: synths, groups, UGens, and CPU usage.",
    {},
    {
      title: "Get Server Status",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async () => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.serverStatus();
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );

  server.tool(
    "free_all",
    "Free all synths and groups on the SuperCollider server. Equivalent to CmdPeriod.",
    {},
    {
      title: "Free All Synths",
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    async () => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          yield* client.freeAll();
          return { freed: true };
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );

  server.tool(
    "list_synthdefs",
    "List all SynthDef names currently loaded in the SuperCollider SynthDescLib.",
    {},
    {
      title: "List SynthDefs",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async () => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.listSynthDefs();
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );

  server.tool(
    "node_tree",
    "Get the current node tree on the SC server, showing all groups and synths.",
    {},
    {
      title: "Get Node Tree",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    async () => {
      const result = await runtime.runPromiseExit(
        Effect.gen(function* () {
          const client = yield* SclangClient;
          return yield* client.nodeTree();
        }),
      );
      if (result._tag === "Failure") return formatError(result.cause);
      return formatSuccess(result.value);
    },
  );
};
