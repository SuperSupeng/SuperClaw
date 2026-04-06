# Contributing to SuperClaw

[中文版](./CONTRIBUTING_zh.md)

Thank you for your interest in contributing to SuperClaw! We welcome contributions from developers worldwide, regardless of experience level. This guide helps you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive experience for everyone. Please be respectful, constructive, and patient in all interactions.

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10 (this repo uses pnpm workspaces)
- **Git**

### Getting Started

```bash
# Fork and clone the repo
git clone https://github.com/<your-username>/SuperClaw.git
cd SuperClaw

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run type checking
pnpm typecheck
```

### Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages (via Turborepo) |
| `pnpm dev` | Run all packages in watch mode |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Type-check all packages |
| `pnpm clean` | Remove all build artifacts and node_modules |

## Project Structure

```
SuperClaw/
├── packages/
│   ├── core/              # @superclaw/core — Runtime engine
│   ├── cli/               # superclaw — CLI tool
│   ├── types/             # @superclaw/types — Shared type definitions
│   ├── channel-cli/       # @superclaw/channel-cli — Terminal adapter
│   ├── channel-discord/   # @superclaw/channel-discord — Discord adapter
│   ├── channel-feishu/    # @superclaw/channel-feishu — Feishu (Lark) adapter
│   └── create-superclaw/  # create-superclaw — Project scaffolding
├── docs/                  # VitePress documentation site
├── examples/
│   ├── single-agent/      # Minimal single-agent example
│   └── team/              # Multi-agent team example
└── .github/workflows/     # CI/CD configuration
```

### Package Dependency Graph

```
@superclaw/types  (pure types, no runtime deps)
       ↑
@superclaw/core   (runtime: agent, model, router, memory, signal, tools)
       ↑
channel-*         (MessageAdapter implementations)
       ↑
superclaw CLI     (assembles core + channels, provides CLI interface)

create-superclaw  (standalone scaffolding tool)
```

## Development Workflow

### Working on a Specific Package

```bash
# Build and test a single package
cd packages/core
pnpm build
pnpm test

# Watch mode for development
pnpm dev
```

### Running the Full Stack

```bash
# Build everything first
pnpm build

# Run an example project
cd examples/single-agent
pnpm dev
```

### Adding a New Channel Adapter

1. Create `packages/channel-<name>/` following the structure of `channel-cli`
2. Implement the `MessageAdapter` interface from `@superclaw/types`
3. Add the package to `pnpm-workspace.yaml`
4. Register the channel type in the core config schema
5. Add tests and documentation

## Coding Standards

### TypeScript

- **ESM only** — all imports use `.js` suffix (TypeScript ESM requirement)
- **Strict mode** enabled via `tsconfig.base.json`
- **Named exports only** — no default exports
- **Type imports** — use `import type` for type-only imports
- **Factory functions** — prefer `createXxx()` over classes (unless implementing an interface)

### Code Style

- Keep files focused — one concept per file
- Use `pino` logger via dependency injection (no global instances)
- Error handling via `SuperClawError` with predefined `ErrorCodes`
- Prefer composition over inheritance

### Tests

- Use **Vitest** for all tests
- Place test files next to source files (`*.test.ts`)
- Test public API surface, not implementation details
- Mock external dependencies (LLM calls, file system, network)

## Submitting Changes

### Pull Request Process

1. **Fork** the repo and create a branch from `main`
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Make your changes** with clear, focused commits
3. **Add tests** for new functionality
4. **Run all checks** before pushing:
   ```bash
   pnpm typecheck
   pnpm build
   pnpm test
   ```
5. **Push** and open a Pull Request
6. **Fill in the PR template** — describe what changed and why
7. **Wait for review** — a maintainer will review your PR

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(core): add MCP tool discovery
fix(discord): handle reconnection on token refresh
docs: update getting started guide
test(router): add binding table edge cases
ci: add Node.js 22 to test matrix
```

Types: `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `perf`, `chore`

### PR Guidelines

- Keep PRs small and focused (one feature or fix per PR)
- Reference related issues: `Fixes #123` or `Relates to #123`
- Make sure CI passes before requesting review
- Be responsive to review feedback

## Reporting Issues

### Bug Reports

Open an issue with:

1. **Steps to reproduce** — minimal reproduction if possible
2. **Expected behavior**
3. **Actual behavior**
4. **Environment** — Node.js version, OS, package versions

### Feature Requests

Open an issue describing:

1. **The problem** you're trying to solve
2. **Proposed solution**
3. **Alternatives** you've considered

## Community

- **GitHub Issues** — Bug reports, feature requests
- **GitHub Discussions** — Questions, ideas, show & tell
- **Pull Requests** — Code contributions

We communicate primarily in English to be inclusive of the global community, but feel free to open issues or discussions in Chinese (中文) as well.

## License

By contributing to SuperClaw, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
