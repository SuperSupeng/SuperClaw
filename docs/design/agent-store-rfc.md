# RFC: Agent Store — SuperClaw Package Registry

> Status: **Draft**  
> Authors: SuperClaw Team  
> Created: 2026-04-06

## Summary

Agent Store is the first layer of the SuperClaw three-tier product vision (Agent Store → Cloud → Runtime). It is a public registry where developers publish, discover, and install pre-built Agent packages — similar to npm for packages, but specialized for AI agent configurations.

## Motivation

Today, building a SuperClaw agent requires writing a `SOUL.md`, configuring tools, setting model parameters, and wiring bindings by hand. Most of this work is boilerplate. A developer who built a great "GitHub Issue Triager" agent has no way to share it with others. Meanwhile, teams who want common agent roles (secretary, researcher, translator) start from scratch every time.

**Core insight**: An agent's personality, tool selection, and domain knowledge are separable from its runtime infrastructure. We can package them as reusable units.

## Product Vision

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│  Layer 3: SuperClaw Runtime                     │
│  Self-hosted / Cloud execution of agent teams   │
└──────────────────────┬──────────────────────────┘
                       │ deploys
┌──────────────────────┴──────────────────────────┐
│  Layer 2: SuperClaw Cloud                       │
│  Hosted runtime, monitoring, scaling, billing   │
└──────────────────────┬──────────────────────────┘
                       │ sources from
┌──────────────────────┴──────────────────────────┐
│  Layer 1: Agent Store (this RFC)                │
│  Registry for agent packages                    │
└─────────────────────────────────────────────────┘
```

## Design

### Agent Package Format

An Agent Package is a directory (or tarball) containing:

```
my-agent/
├── manifest.json       # Package metadata
├── SOUL.md             # Agent personality and instructions
├── HEARTBEAT.md        # (optional) Periodic self-check tasks
├── COMPANY-STATE.md    # (optional) Default org state template
├── knowledge/          # (optional) Bundled knowledge files
│   ├── domain-guide.md
│   └── faq.md
├── tools/              # (optional) Custom function tools
│   └── summarize.ts
└── README.md           # Usage documentation
```

### manifest.json

```json
{
  "name": "@superclaw-store/github-triager",
  "version": "1.0.0",
  "displayName": "GitHub Issue Triager",
  "description": "Automatically triages GitHub issues by priority, labels, and assignees",
  "author": "jane-dev",
  "license": "MIT",
  "tier": "worker",
  "tags": ["github", "devops", "triage"],
  "model": {
    "primary": "gpt-4o-mini",
    "fallbacks": ["claude-3-haiku"]
  },
  "tools": [
    { "type": "cli", "name": "gh" },
    { "type": "function", "name": "summarize", "handler": "./tools/summarize.ts" }
  ],
  "knowledge": {
    "sources": [
      { "type": "local-files", "path": "./knowledge" }
    ]
  },
  "requiredProviders": ["openai"],
  "superclaw": ">=0.1.0"
}
```

The `manifest.json` follows the existing `AgentPackageManifest` type from `@superclaw-ai/types/package.ts`.

### CLI Integration

```bash
# Browse and search the store
superclaw store search "github"
superclaw store info @superclaw-store/github-triager

# Install an agent into your project
superclaw store install @superclaw-store/github-triager
# → Creates agents/github-triager/ with SOUL.md, tools, knowledge
# → Adds agent config entry to superclaw.config.json

# Publish your own agent
superclaw store publish ./agents/my-agent
# → Validates manifest.json
# → Uploads to registry

# Update installed agents
superclaw store update
superclaw store update @superclaw-store/github-triager
```

### Install Workflow

When a user runs `superclaw store install <package>`:

1. **Fetch** — Download the package tarball from the registry
2. **Validate** — Check manifest.json against schema, verify compatibility with current SuperClaw version
3. **Extract** — Unpack into `agents/<name>/`
4. **Wire** — Add an agent entry to `superclaw.config.json` with sensible defaults
5. **Prompt** — Ask user to configure required fields (e.g., which channel to bind to, API keys for required providers)

### Registry Architecture

```
┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  CLI Client  │────▶│  Registry   │────▶│  Blob Store │
│  superclaw   │     │  API (REST) │     │  (tarballs) │
└──────────────┘     └──────┬──────┘     └─────────────┘
                            │
                     ┌──────┴──────┐
                     │  Metadata   │
                     │  Database   │
                     └─────────────┘
```

**Phase 1** (MVP): Use GitHub Releases as the backing store. Each published agent is a GitHub repository with tagged releases. The "registry" is a GitHub-based index (JSON file or GitHub API queries). Zero infrastructure cost.

**Phase 2**: Dedicated registry service with:
- REST API for search, publish, install
- CDN-backed blob storage for tarballs
- PostgreSQL for metadata (name, version, downloads, ratings)
- Auth via GitHub OAuth

### API Design (Phase 2)

```
GET    /api/v1/packages?q=<query>&tags=<tags>&sort=<sort>
GET    /api/v1/packages/<name>
GET    /api/v1/packages/<name>/versions
GET    /api/v1/packages/<name>/<version>/download
POST   /api/v1/packages                    # Publish (auth required)
DELETE /api/v1/packages/<name>/<version>    # Unpublish (auth required)
```

### Quality & Trust

- **Verified publishers** — GitHub account verification
- **Automated validation** — Schema check, SOUL.md presence, no secrets in package
- **Community ratings** — Stars, download counts, usage stats
- **Security scanning** — Scan custom tool code for dangerous patterns (shell injection, network access)
- **Curated collections** — Official "starter pack" agents maintained by SuperClaw team

### Pre-built Agent Ideas (Starter Pack)

| Agent | Tier | Tools | Description |
|-------|------|-------|-------------|
| `secretary` | coordinator | calendar, email | Meeting scheduling, email drafting |
| `researcher` | worker | browser, search | Web research and summarization |
| `github-triager` | worker | gh CLI | Issue triage, PR review assignment |
| `code-reviewer` | worker | gh, git | Automated code review feedback |
| `translator` | worker | — | Multi-language content translation |
| `report-writer` | worker | — | Generate reports from data |
| `devops-monitor` | worker | kubectl, aws | Infrastructure monitoring alerts |
| `content-creator` | worker | — | Blog posts, social media content |

## Compatibility with Existing Types

The `@superclaw-ai/types` package already defines `AgentPackageManifest`:

```ts
// packages/types/src/package.ts
export interface AgentPackageManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  // ...
}
```

Agent Store will extend this type as needed while maintaining backward compatibility.

## Implementation Phases

### Phase 1: Local Packages (v0.2)
- `superclaw store install <path>` from local directory or git URL
- Validation and wiring into config
- No central registry, just direct git/local references

### Phase 2: GitHub-Based Registry (v0.3)
- Publish to GitHub repos with `superclaw-agent` topic
- Search via GitHub API
- `superclaw store search` queries GitHub
- Version management via git tags

### Phase 3: Dedicated Registry (v1.0)
- Full registry service
- Web UI for browsing
- Download analytics
- Verified publishers, ratings

## Open Questions

1. **Namespace strategy** — Use `@superclaw-store/<name>` scoped packages? Or flat names with ownership?
2. **Dependency between agents** — Should one agent package depend on another? (e.g., a "team pack" that installs multiple agents with pre-configured signals)
3. **Configuration templating** — How much of the config should be pre-set vs. prompted on install?
4. **Update strategy** — How to handle breaking changes in SOUL.md when updating an agent? Merge? Override? Diff?
5. **Monetization** — Should the store support paid agent packages for commercial use cases?

## Rejected Alternatives

### npm Registry Reuse
Using npm directly was considered but rejected because:
- Agent packages are not Node.js modules; they contain SOUL.md, knowledge files, and config — not JavaScript code
- npm's resolution algorithm is overkill for agent packages
- We want agent-specific metadata (tier, tools, model requirements) in the registry index

### Docker/OCI Images
Too heavy for what is essentially config + markdown + optional tool scripts. An agent package is typically <100KB.

## References

- [SuperClaw Agent Types](https://github.com/SuperSupeng/SuperClaw/blob/main/packages/types/src/agent.ts)
- [Package Manifest Type](https://github.com/SuperSupeng/SuperClaw/blob/main/packages/types/src/package.ts)
- [Existing CLI Commands](https://github.com/SuperSupeng/SuperClaw/blob/main/packages/cli/src/)
