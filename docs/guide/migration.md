# Migration from OpenClaw

SuperClaw provides a built-in migration command to convert OpenClaw projects.

## Quick Migration

```bash
superclaw migrate --from ./openclaw.json
```

This single command handles the full conversion.

## What It Does

1. **Reads** your `openclaw.json` configuration.
2. **Converts** it to `superclaw.config.ts` format (primitives mapping, channel bindings, memory config).
3. **Copies agent definitions** from your OpenClaw agents directory into the SuperClaw structure.
4. **Migrates environment variables** — renames `OPENCLAW_*` vars to `SUPERCLAW_*` and writes a new `.env` file.

## Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--from <path>` | Path to your `openclaw.json` | `./openclaw.json` |
| `--dry-run` | Preview changes without writing files | `false` |
| `--copy-agents` | Copy agent definition files into the new project | `true` |
| `--start` | Start the SuperClaw dev server after migration | `false` |

## Examples

Preview what will change:

```bash
superclaw migrate --from ./openclaw.json --dry-run
```

Migrate and start immediately:

```bash
superclaw migrate --from ./openclaw.json --start
```

Migrate config only (skip agent files):

```bash
superclaw migrate --from ./openclaw.json --no-copy-agents
```

## Compatibility

- OpenClaw v1.x and v2.x configs are both supported.
- Agent prompt files (`.md`, `.txt`) are copied as-is — no manual rewriting needed.
- Tool bindings are mapped to SuperClaw's CLI-native tool format automatically.
- If a feature has no direct equivalent in SuperClaw, the migrator emits a warning and leaves a `TODO` comment in the generated config.
