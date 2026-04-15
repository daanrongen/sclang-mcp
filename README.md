# sclang-mcp

MCP server for SuperCollider. Evaluate sclang code, boot the audio server, and inspect synths and node trees from any MCP client.

## Tools

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
| `SCLANG_PATH` | `/Applications/SuperCollider.app/Contents/MacOS/sclang` | Path to sclang binary |
| `SCLANG_CONF` | _(none)_ | Optional path to sclang_conf.yaml |

## Usage

Add to your MCP client config:

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

## Development

```sh
bun install
bun test
bun run lint
bun run typecheck
bun run build
```

## License

MIT
