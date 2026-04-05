# SuperClaw

**Build your digital workforce in minutes.**

[![CI](https://github.com/nicepkg/superclaw/actions/workflows/ci.yml/badge.svg)](https://github.com/nicepkg/superclaw/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@superclaw/core.svg)](https://www.npmjs.com/package/@superclaw/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SuperClaw is a framework for building teams of AI agents that collaborate, delegate, and use CLI tools to get work done. Define agents with personalities, wire them to channels (CLI, Discord, Feishu), and let them work together.

## Quick Start

```bash
# 1. Scaffold a project
npx create-superclaw my-team

# 2. Install and configure
cd my-team && pnpm install
cp .env.example .env   # Add your API key

# 3. Run
pnpm dev
```

## Core Concepts: Six Primitives

| Primitive | What it does |
|-----------|-------------|
| **Agent** | A persistent AI role with a personality (SOUL.md), tools, and a model. Three tiers: Executive, Coordinator, Worker. |
| **Team** | Groups agents together with collaboration rules. |
| **Channel** | Communication interface (CLI, Discord, Feishu, etc.). |
| **Binding** | Wires an Agent to a Channel. |
| **Signal** | Internal message between agents for delegation and coordination. |
| **Memory** | Four-layer file-based memory: SOUL, COMPANY-STATE, MEMORY, HEARTBEAT. |

## CLI Tools: First-Class Citizens

SuperClaw agents use CLI tools directly -- no SDK wrappers needed.

```json
{
  "tools": [
    { "type": "cli", "name": "gh", "description": "GitHub CLI" },
    { "type": "cli", "name": "jq", "description": "JSON processor" }
  ]
}
```

Your agent can run `gh pr create`, `kubectl get pods`, `aws s3 ls` -- any CLI tool you give it access to.

## Architecture

```
User ──► Channel (CLI / Discord / Feishu)
              │
              ▼
           Router ──► Binding ──► Agent (Executive)
                                     │ Signal
                                     ▼
                                  Agent (Coordinator)
                                     │ Signal
                                     ▼
                                  Agent (Worker) ──► CLI Tools
                                     │
                                     ▼
                                  Memory (SOUL / COMPANY-STATE / MEMORY / HEARTBEAT)
```

## Packages

| Package | Description |
|---------|-------------|
| `@superclaw/core` | Runtime engine, agent lifecycle, router, signal bus |
| `@superclaw/cli` | CLI interface (`superclaw dev`, `superclaw start`) |
| `@superclaw/types` | Shared TypeScript type definitions |
| `@superclaw/channel-cli` | Terminal channel adapter |
| `@superclaw/channel-discord` | Discord channel adapter |
| `create-superclaw` | Project scaffolding tool |

## Documentation

- [Getting Started](https://superclaw.dev/guide/getting-started)
- [Core Concepts](https://superclaw.dev/guide/concepts)
- [Configuration Reference](https://superclaw.dev/guide/configuration)
- [CLI Tools Integration](https://superclaw.dev/guide/cli-tools)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

[MIT](./LICENSE)
