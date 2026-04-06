# SuperClaw

**The first open-source framework for building digital organizations, not just agents.**

[![CI](https://github.com/SuperSupeng/SuperClaw/actions/workflows/ci.yml/badge.svg)](https://github.com/SuperSupeng/SuperClaw/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@superclaw/core.svg)](https://www.npmjs.com/package/@superclaw/core)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

English | [中文](./README_zh.md)

Most agent frameworks give you a single smart loop. SuperClaw gives you an org chart -- agents with roles, reporting lines, async communication, and memory that decays like a real company's institutional knowledge. Define your digital workforce in config, wire it to channels (CLI, Discord, Feishu), and let them collaborate.

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

## Six Primitives

Everything in SuperClaw is built from six concepts:

| Primitive | What it does |
|-----------|-------------|
| **Agent** | A persistent AI role with a personality (SOUL.md), tools, and a model. Three tiers: Executive, Coordinator, Worker. |
| **Team** | Groups agents with collaboration rules and reporting structure. |
| **Channel** | Communication interface (CLI, Discord, Feishu, etc.). |
| **Binding** | Wires an Agent to a Channel. |
| **Signal** | Async message between agents for delegation and coordination, with SLA tracking. |
| **Memory** | Four-layer file-based memory: SOUL, COMPANY-STATE, MEMORY, HEARTBEAT. |

## Design Principles

**Hourglass Principle** -- Humans are the bottleneck, not agents. Type 1 decisions (irreversible: budget approval, public announcements) require human sign-off. Type 2 decisions (reversible: drafting, research, scheduling) are fully autonomous. The framework enforces this boundary.

**Ball Possession Principle** -- Every interaction ends with a clear next action assigned to a specific party. No "let me know if you need anything" dead ends. When an agent finishes a turn, it either hands the ball to another agent, returns it to the human, or schedules a follow-up.

**Layered Loading** -- Agents boot in 8 steps, loading context progressively: org state, soul, knowledge, focus, then signals. This keeps token budgets tight -- agents only load what they need for the current task.

**Memory Decay** -- Expired memories are auto-cleaned. During idle time, `autoDream` consolidates fragmented memories into durable knowledge. No infinite context windows, no stale data.

## Architecture

```
                         Channels
                    +------+------+------+
                    | CLI  | Discord | Feishu |
                    +------+------+------+
                           |
                           v
                    +-------------+
                    |   Router    |--- Binding Table
                    +-------------+
                           |
              +------------+------------+
              |            |            |
              v            v            v
         +---------+  +---------+  +---------+
         |Executive|  |Coord.   |  |Coord.   |
         |  Agent  |  |  Agent  |  |  Agent  |
         +---------+  +---------+  +---------+
              |            |            |
         Signal Bus   Signal Bus   Signal Bus
              |            |            |
              v            v            v
         +---------+  +---------+  +---------+
         | Worker  |  | Worker  |  | Worker  |
         |  Agent  |  |  Agent  |  |  Agent  |
         +----+----+  +----+----+  +----+----+
              |            |            |
              v            v            v
         CLI Tools    CLI Tools    CLI Tools

    Memory Layer: SOUL | COMPANY-STATE | MEMORY | HEARTBEAT
    Knowledge:    Local Files | autoDream consolidation
```

## Key Features

- **CLI tools as first-class citizens** -- Agents call `gh`, `kubectl`, `jq`, `aws` directly. No SDK wrappers.
- **Hot reload** -- Change `superclaw.config.json` and agents reconfigure live. No restarts.
- **MCP support** -- Model Context Protocol integration for tool discovery and execution.
- **Challenge directive** -- Agents flag when human actions contradict stated values or goals.
- **Cron scheduling** -- Agents can run on schedules, not just in response to messages.
- **Migrate from OpenClaw** -- Built-in parser and converter for existing OpenClaw projects.

## Packages

| Package | Description |
|---------|-------------|
| `@superclaw/core` | Runtime engine, agent lifecycle, router, signal bus |
| `@superclaw/cli` | CLI interface (`superclaw dev`, `superclaw start`) |
| `@superclaw/types` | Shared TypeScript type definitions |
| `@superclaw/channel-cli` | Terminal channel adapter |
| `@superclaw/channel-discord` | Discord channel adapter |
| `@superclaw/channel-feishu` | Feishu (Lark) channel adapter |
| `@superclaw/channel-dingtalk` | DingTalk channel adapter |
| `@superclaw/channel-telegram` | Telegram channel adapter |
| `create-superclaw` | Project scaffolding tool |

## Documentation

- [Getting Started](https://superclaw.dev/guide/getting-started)
- [Core Concepts](https://superclaw.dev/guide/concepts)
- [Configuration Reference](https://superclaw.dev/guide/configuration)
- [CLI Tools Integration](https://superclaw.dev/guide/cli-tools)

## Contributing

We welcome contributions from developers worldwide! See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

[贡献指南 (中文)](./CONTRIBUTING_zh.md)

## License

[Apache License 2.0](./LICENSE)
