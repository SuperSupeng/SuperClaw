# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-06

### Added

**Core Runtime**
- Agent loop with tool-call iteration and conversation history per sender
- 8-step boot sequence with progressive context loading
- Agent manager for batch lifecycle control (create, boot, shutdown)
- Model router with provider fallback chain and per-call logging
- OpenAI-compatible model provider via Vercel AI SDK (supports OpenAI and Anthropic)
- Tool registry with unified execute interface across tool types
- Function executor for dynamic handler import
- CLI executor with shell command dispatch, JSON/text parsing, and timeout handling
- Event bus (typed EventEmitter wrapper) for system-wide pub/sub
- Binding table with filter matching and priority-based routing
- Message queue with per-agent buffering, debounce, and overflow discard
- Message router connecting channels to agents via binding resolution
- HTTP gateway server (native node:http) with /health, /api/message, /api/agents
- Config loader with YAML/JSON support, directory traversal, and env-var interpolation
- Zod-based config schema validation with friendly error messages
- Config file watcher with diff-based change detection

**Memory and Knowledge**
- SOUL.md loader for agent personality/system-prompt files
- MEMORY.md store with structured entry read/write and YAML frontmatter
- Memory decay engine filtering expired entries by valid_until
- Heartbeat loader and executor for recurring task schedules
- Company state loader for organization context (COMPANY-STATE.md)
- AutoDream module for background memory consolidation
- Knowledge loader with pluggable provider interface
- Local-files knowledge source with keyword-based query

**Signals and SLA**
- Signal bus for inter-agent message passing (send, consume, getPending)
- SLA monitor with duration parsing and deadline tracking

**Team Collaboration**
- Organization tree for hierarchical agent structures
- Delegation engine for task routing between agents

**Decision and Lanes**
- Decision engine for agent response strategy selection
- Lane manager and executor for parallel workflow execution

**Cron**
- Cron scheduler for time-based agent task triggering

**MCP**
- MCP client for Model Context Protocol tool integration
- Schema validator for MCP tool definitions

**Migration**
- OpenClaw config parser for legacy project migration
- Environment variable migrator
- Config format converter

**Channels**
- Discord adapter implementing MessageAdapter (multi-bot, DM, group)
- Discord client manager with per-account Client instances and auto-reconnect
- Discord message converter (mention, reply, attachment handling)
- Discord DM handler with allow/deny/allowlist policy
- Discord group handler with mention/all/none policy
- Feishu (Lark) adapter with DM, group, and message conversion support
- CLI channel adapter for terminal-based agent interaction

**CLI**
- `superclaw dev` command (dev mode with CLI channel enabled)
- `superclaw start` command (production mode)
- `superclaw init` command (initialize project in current directory)
- `superclaw add agent <name>` command (scaffold new agent)
- `superclaw migrate` command (convert legacy OpenClaw configs)

**Scaffolding**
- `npx create-superclaw` interactive project generator
- Basic template (single agent + config + SOUL.md)
- Team template (secretary, researcher, writer agents)

**Types**
- Shared type package (@superclaw/types) covering all six primitives
- Type definitions for Agent, Model, Tool, Channel, Binding, Signal, Memory, Knowledge, Config, Runtime, Events, Errors, and Package manifest

**Testing**
- 79 unit and E2E tests across core modules (all passing)
- Unit tests for event bus, config schema, binding table, message queue, router, model router, signal bus, SLA monitor, cron scheduler, lane manager, decision engine, boot sequence, and memory store
- E2E smoke tests for CLI commands

**Docs**
- VitePress documentation site with getting-started, concepts, configuration, and CLI tools guides
- Design principles document
- Migration guide from OpenClaw
- README rewritten for open-source audience
- CONTRIBUTING.md with contributor guidelines
- Single-agent and team example projects
- GitHub Actions CI workflow (typecheck, lint, test, build)

[0.1.0]: https://github.com/nicepkg/SuperClaw/releases/tag/v0.1.0
