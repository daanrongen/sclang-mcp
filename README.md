# sclang-mcp

MCP server for SuperCollider. Evaluate sclang code, boot the audio server, and inspect synths and node trees from any MCP client.

## Installation

```sh
bunx @daanrongen/sclang-mcp
```

## Tools (7)

| Tool | Description |
|---|---|
| `eval` | Evaluate SuperCollider code and return the result |
| `boot` | Boot the scsynth audio server |
| `server_status` | Query synth count, CPU usage, and sample rate |
| `free_all` | Free all synths and groups (CmdPeriod) |
| `list_synthdefs` | List all loaded SynthDef names |
| `node_tree` | Get the server's node tree |
| `load_file` | Load and evaluate an .scd file |

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `SCLANG_PATH` | `/Applications/SuperCollider.app/Contents/MacOS/sclang` | Path to the sclang binary |
| `SCLANG_CONF` | _(none)_ | Optional path to a `sclang_conf.yaml` |

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sclang": {
      "command": "bunx",
      "args": ["@daanrongen/sclang-mcp"],
      "env": {
        "SCLANG_PATH": "/Applications/SuperCollider.app/Contents/MacOS/sclang"
      }
    }
  }
}
```

### Claude Code

```sh
claude mcp add sclang -e SCLANG_PATH=/Applications/SuperCollider.app/Contents/MacOS/sclang -- bunx @daanrongen/sclang-mcp
```

## Development

```sh
bun install          # install dependencies
bun run dev          # run with file watching
bun test             # run tests
bun run lint         # lint with Biome
bun run format       # format with Biome
bun run typecheck    # type-check with tsc
bun run build        # compile to dist/
bun run inspect      # open MCP Inspector against built server
```

## Inspecting Locally

Build first, then open the MCP Inspector:

```sh
bun run build
bun run inspect
```

The inspector connects to the server over stdio and lets you call tools interactively.

## Architecture

```
src/
├── config.ts              # Effect Config (SCLANG_PATH, SCLANG_CONF)
├── main.ts                # Entry point — wires server + Layer
├── domain/
│   ├── errors.ts          # Tagged domain errors
│   ├── errors.test.ts
│   ├── models.ts          # Domain types (EvalResult, ServerStatus, …)
│   ├── models.test.ts
│   ├── SclangClient.ts    # Port: Effect.Tag service interface
│   └── SclangClient.test.ts
├── infra/
│   ├── SclangClientLive.ts   # Adapter: spawns sclang process
│   ├── SclangClientTest.ts   # Adapter: in-memory stub for tests
│   └── SclangClientTest.test.ts
└── mcp/
    ├── server.ts          # MCP Server setup
    ├── utils.ts           # Shared tool helpers
    └── tools/
        ├── eval.ts        # eval tool
        ├── files.ts       # load_file tool
        └── server-tools.ts  # boot, server_status, free_all, list_synthdefs, node_tree
```

## License

MIT
