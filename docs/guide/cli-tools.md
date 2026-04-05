# CLI Tools Integration

CLI tools are SuperClaw's secret weapon. Instead of wrapping every SaaS API in custom code, your agents use the same CLI tools that developers already know and love.

## Why CLI Tools?

The software world has converged on CLI tools as the universal interface:

- **GitHub** has `gh` — create PRs, manage issues, review code
- **Jira** has `jira-cli` — manage tickets and sprints
- **AWS** has `aws` — manage cloud infrastructure
- **Kubernetes** has `kubectl` — manage clusters
- **Feishu/Lark** has `feishu-cli` — send messages, manage docs

These tools are:

1. **Already built and maintained** by the platform teams
2. **Well documented** with `--help` flags
3. **Battle-tested** in production environments
4. **Composable** via pipes and scripts

SuperClaw treats CLI tools as first-class citizens. An agent doesn't need a custom GitHub integration — it just runs `gh`.

## How It Works

When you give an agent access to CLI tools, SuperClaw:

1. Makes the tool available in the agent's sandbox
2. The agent decides when and how to use it (based on its SOUL and the conversation)
3. Commands execute in a sandboxed environment with configurable permissions
4. Output flows back to the agent as context

## Configuration

### Basic Tool Access

Add tools to an agent's config:

```json
{
  "agents": [
    {
      "id": "developer",
      "name": "Developer",
      "soul": "agents/developer/SOUL.md",
      "tier": "worker",
      "lifecycle": "persistent",
      "model": { "primary": "gpt-4o" },
      "tools": [
        {
          "type": "cli",
          "name": "gh",
          "description": "GitHub CLI for managing repos, PRs, and issues"
        },
        {
          "type": "cli",
          "name": "jq",
          "description": "JSON processor for parsing API responses"
        }
      ]
    }
  ]
}
```

### Sandbox Restrictions

Control what each agent can do:

```json
{
  "sandbox": {
    "allowedPaths": ["/workspace", "/tmp"],
    "allowedDomains": ["api.github.com", "github.com"],
    "maxExecutionTime": 30000,
    "maxMemory": 512
  }
}
```

### MCP Servers as Tools

For richer tool interactions, you can also connect MCP (Model Context Protocol) servers:

```json
{
  "mcp": {
    "servers": [
      {
        "id": "github",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
      }
    ]
  }
}
```

## Example: GitHub Workflow Agent

Here's a complete example of an agent that manages GitHub workflows:

**`agents/developer/SOUL.md`**

```markdown
# Developer Agent

You are a senior developer assistant. Your job is to help manage
the GitHub repository.

## Tools

- Use `gh` to interact with GitHub (PRs, issues, releases)
- Use `git` for version control operations
- Use `jq` to parse JSON output

## Guidelines

- Always check existing PRs before creating new ones
- Write clear PR descriptions with context
- Label issues appropriately
```

**`superclaw.config.json`** (relevant parts):

```json
{
  "agents": [
    {
      "id": "developer",
      "name": "Developer",
      "soul": "agents/developer/SOUL.md",
      "tier": "worker",
      "lifecycle": "persistent",
      "model": { "primary": "gpt-4o" },
      "tools": [
        { "type": "cli", "name": "gh" },
        { "type": "cli", "name": "git" },
        { "type": "cli", "name": "jq" }
      ],
      "sandbox": {
        "allowedPaths": ["/workspace"],
        "maxExecutionTime": 60000
      }
    }
  ]
}
```

**In action:**

```
You > Create a PR for the changes in the feature/auth branch

developer > I'll create a PR for you. Let me check the branch first.

  Running: gh pr list --head feature/auth
  → No existing PRs found.

  Running: git log main..feature/auth --oneline
  → 3 commits: add auth middleware, add token validation, add tests

  Running: gh pr create --title "Add authentication middleware" \
    --body "## Changes\n- Auth middleware\n- Token validation\n- Tests" \
    --base main --head feature/auth

  ✓ PR #42 created: https://github.com/org/repo/pull/42

Done! I've created PR #42 with a summary of the 3 commits.
```

## Best Practices

1. **Be specific in SOUL.md** — Tell the agent which tools it has and when to use them
2. **Use sandbox restrictions** — Limit file system access and network domains
3. **Prefer CLI over custom code** — If a CLI tool exists, use it instead of building a custom integration
4. **Compose tools** — Agents can pipe output between tools, just like shell scripts
5. **Set execution timeouts** — Prevent runaway commands with `maxExecutionTime`
