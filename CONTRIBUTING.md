# Contributing to SuperClaw

Thanks for your interest in contributing! This guide will help you get set up.

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10 (this repo uses pnpm workspaces)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/nicepkg/superclaw.git
cd superclaw

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run tests
pnpm test
```

### Project Structure

```
packages/
  core/              # Runtime engine
  cli/               # CLI tool
  types/             # Shared type definitions
  channel-cli/       # Terminal channel adapter
  channel-discord/   # Discord channel adapter
  create-superclaw/  # Project scaffolding
docs/                # VitePress documentation site
examples/
  single-agent/      # Minimal single-agent example
  team/              # Multi-agent team example
```

### Development Workflow

```bash
# Run everything in dev mode (with hot reload)
pnpm dev

# Build a specific package
cd packages/core && pnpm build

# Run tests for a specific package
cd packages/core && pnpm test
```

## Code Style

- **TypeScript** for all source code
- **Strict mode** enabled (`tsconfig.base.json`)
- Use **named exports** (no default exports)
- Prefer **interfaces** over type aliases for object shapes
- Keep files focused -- one concept per file

## Pull Request Process

1. **Fork** the repo and create a branch from `main`
2. **Make your changes** with clear, focused commits
3. **Add tests** for new functionality
4. **Run checks** before pushing:
   ```bash
   pnpm typecheck
   pnpm build
   pnpm test
   ```
5. **Open a PR** with a clear description of what changed and why
6. **Wait for review** -- a maintainer will review your PR

### PR Guidelines

- Keep PRs small and focused (one feature or fix per PR)
- Write a clear title and description
- Reference related issues with `Fixes #123` or `Relates to #123`
- Make sure CI passes before requesting review

## Reporting Bugs

Open an issue with:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Environment info (Node version, OS, etc.)

## Feature Requests

Open an issue describing:

1. The problem you're trying to solve
2. Your proposed solution
3. Any alternatives you've considered

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
