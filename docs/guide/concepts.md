# Core Concepts

SuperClaw is built on **six primitives**. Every feature in the framework maps to one of these building blocks.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Gateway (HTTP)                    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                     Router                          │
│         (message dedup, queue, dispatch)             │
└──┬──────────┬──────────┬──────────┬─────────────────┘
   │          │          │          │
┌──▼──┐  ┌───▼──┐  ┌───▼───┐  ┌──▼───┐
│ CLI │  │ Disc │  │ Feishu│  │ ...  │   ← Channels
└──┬──┘  └───┬──┘  └───┬───┘  └──┬───┘
   │         │         │         │
   └─────────┴────┬────┴─────────┘
                  │  Bindings
   ┌──────────────▼──────────────────┐
   │            Team                 │
   │  ┌───────────────────────────┐  │
   │  │  Executive (decisions)    │  │
   │  └───────────┬───────────────┘  │
   │              │ Signals          │
   │  ┌───────────▼───────────────┐  │
   │  │  Coordinator (routing)    │  │
   │  └───────────┬───────────────┘  │
   │              │ Delegation       │
   │  ┌───────────▼───────────────┐  │
   │  │  Worker (execution)       │  │
   │  └───────────────────────────┘  │
   └─────────────────────────────────┘
```

## The Six Primitives

### 1. Agent

An **Agent** is a persistent AI role — your digital employee. Each agent has a personality (defined in `SOUL.md`), a set of tools, and a model configuration.

Agents follow a **three-tier hierarchy**:

| Tier | Role | Example |
|------|------|---------|
| **Executive** | Makes high-level decisions, sets priorities | CEO agent that triages incoming requests |
| **Coordinator** | Breaks down tasks, delegates to workers | Project manager that assigns subtasks |
| **Worker** | Executes specific tasks using tools | Developer agent that runs `gh pr create` |

```json
{
  "id": "researcher",
  "name": "Researcher",
  "soul": "agents/researcher/SOUL.md",
  "tier": "worker",
  "lifecycle": "persistent",
  "model": { "primary": "gpt-4o" }
}
```

### 2. Team

A **Team** groups agents together and defines their collaboration rules. Agents within a team can delegate tasks to each other via Signals.

```json
{
  "id": "content-team",
  "name": "Content Team",
  "agents": ["secretary", "researcher", "writer"]
}
```

### 3. Channel

A **Channel** is a communication interface — the way agents receive and send messages. SuperClaw treats everything as a channel, including the CLI itself.

Built-in channels:
- **CLI** — Terminal-based interaction
- **Discord** — Discord bot integration
- **Feishu** — Feishu/Lark bot integration

The key insight: **CLI tools are also channels**. When an agent runs `gh pr list`, it's communicating through the GitHub CLI channel.

### 4. Binding

A **Binding** wires an Agent to a Channel. It answers the question: "Which agent responds on which channel?"

```json
{
  "bindings": [
    { "agent": "assistant", "channel": "cli" },
    { "agent": "assistant", "channel": "my-discord" }
  ]
}
```

One agent can be bound to many channels. One channel can be served by many agents (the router decides who handles each message).

### 5. Signal

A **Signal** is an internal message between agents. When an Executive agent decides to delegate a task, it sends a Signal to a Coordinator or Worker.

Signal types are defined in the config:

```json
{
  "signalTypes": [
    { "id": "task.assign", "schema": { "title": "string", "description": "string" } },
    { "id": "task.complete", "schema": { "result": "string" } }
  ]
}
```

Signals enable agent-to-agent collaboration without exposing internal communication to the end user.

### 6. Memory

Every agent has a **four-layer memory system**, stored as files in the agent's directory:

| Layer | File | Purpose | Mutability |
|-------|------|---------|------------|
| **SOUL** | `SOUL.md` | Personality, values, communication style | Immutable (set by human) |
| **COMPANY-STATE** | `COMPANY-STATE.md` | Shared organizational knowledge | Slowly changing |
| **MEMORY** | `MEMORY.md` | Agent's personal working memory | Agent-managed |
| **HEARTBEAT** | `HEARTBEAT.md` | Current status and active tasks | Frequently updated |

This file-based approach means:
- Memory is **version-controllable** (just commit the files)
- Memory is **human-readable** (open any file to see what the agent knows)
- Memory is **debuggable** (check HEARTBEAT.md to see what went wrong)

## Putting It All Together

A typical SuperClaw setup:

1. You define **Agents** with personalities and tools
2. You group them into **Teams**
3. You configure **Channels** (CLI, Discord, etc.)
4. You create **Bindings** to wire agents to channels
5. Agents communicate internally via **Signals**
6. Each agent maintains its own **Memory** files

The result is a digital workforce that is transparent, debuggable, and version-controlled.
