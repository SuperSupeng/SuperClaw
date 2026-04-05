# Configuration Reference

SuperClaw is configured through a single `superclaw.config.json` file at the root of your project.

## Minimal Config

```json
{
  "version": "1",
  "providers": {
    "openai": {
      "type": "openai",
      "apiKey": { "env": "OPENAI_API_KEY" }
    }
  },
  "agents": [
    {
      "id": "assistant",
      "name": "Assistant",
      "soul": "agents/assistant/SOUL.md",
      "tier": "worker",
      "lifecycle": "persistent",
      "model": { "primary": "gpt-4o" }
    }
  ],
  "channels": {
    "cli": { "type": "cli" }
  },
  "bindings": [
    { "agent": "assistant", "channel": "cli" }
  ]
}
```

## Full Reference

### `version`

**Required.** Config schema version. Currently `"1"`.

### `name`

Optional project name.

### `providers`

**Required.** A map of LLM provider configurations.

```json
{
  "providers": {
    "openai": {
      "type": "openai",
      "apiKey": { "env": "OPENAI_API_KEY" },
      "baseUrl": "https://api.openai.com/v1"
    },
    "anthropic": {
      "type": "anthropic",
      "apiKey": { "env": "ANTHROPIC_API_KEY" }
    }
  }
}
```

Each provider has:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Provider type: `"openai"`, `"anthropic"`, etc. |
| `apiKey` | `string \| { env: string }` | API key or env reference |
| `baseUrl` | `string?` | Custom API endpoint |

### `agents`

**Required.** Array of agent configurations.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `soul` | `string` | Path to SOUL.md file |
| `tier` | `"executive" \| "coordinator" \| "worker"` | Agent hierarchy level |
| `lifecycle` | `"persistent" \| "ephemeral"` | Whether the agent runs continuously |
| `model` | `ModelConfig` | Model configuration |
| `tools` | `ToolConfig[]?` | Available tools |
| `knowledge` | `KnowledgeSourceConfig[]?` | Knowledge sources |
| `team` | `string?` | Team ID this agent belongs to |
| `agentDir` | `string?` | Directory for agent files (SOUL.md, MEMORY.md, etc.) |
| `workspace` | `string?` | Working directory for file operations |
| `delegation` | `DelegationConfig?` | Delegation rules |
| `sandbox` | `SandboxConfig?` | Sandbox restrictions |
| `metadata` | `Record<string, unknown>?` | Custom metadata |

### `agentDefaults`

Global defaults applied to all agents (individual agent config takes precedence).

```json
{
  "agentDefaults": {
    "model": {
      "primary": "gpt-4o",
      "fallbacks": ["gpt-4o-mini"]
    },
    "tools": ["read_file", "write_file", "run_command"],
    "sandbox": {
      "maxExecutionTime": 30000,
      "maxMemory": 512
    }
  }
}
```

### `teams`

Optional array of team definitions.

```json
{
  "teams": [
    {
      "id": "content-team",
      "name": "Content Team",
      "agents": ["secretary", "researcher", "writer"]
    }
  ]
}
```

### `channels`

**Required.** A map of channel configurations.

```json
{
  "channels": {
    "cli": { "type": "cli" },
    "my-discord": {
      "type": "discord",
      "token": { "env": "DISCORD_TOKEN" },
      "allowedChannels": ["general", "bot-commands"]
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | Channel type: `"cli"`, `"discord"`, `"feishu"`, etc. |
| `token` | `string \| { env: string }?` | Auth token (for external channels) |

Additional fields depend on the channel type.

### `bindings`

**Required.** Array of agent-to-channel bindings.

```json
{
  "bindings": [
    {
      "agent": "assistant",
      "channel": "cli",
      "filter": { "mentionsAgent": true }
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `agent` | `string` | Agent ID |
| `channel` | `string` | Channel ID |
| `filter` | `object?` | Optional message filter |

### `signalTypes`

Define custom signal types for agent-to-agent communication.

```json
{
  "signalTypes": [
    {
      "id": "task.assign",
      "schema": { "title": "string", "description": "string", "priority": "number" }
    }
  ]
}
```

### `mcp`

MCP (Model Context Protocol) server configuration for extended tool access.

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

### `gateway`

HTTP gateway configuration for external integrations.

```json
{
  "gateway": {
    "port": 3000,
    "mode": "development",
    "authToken": { "env": "GATEWAY_TOKEN" },
    "healthPath": "/health"
  }
}
```

### `router`

Message routing configuration.

```json
{
  "router": {
    "debounce": { "discord": 1000, "feishu": 500 },
    "maxQueueSize": 100
  }
}
```

### `cron`

Scheduled task configuration.

```json
{
  "cron": {
    "enabled": true,
    "store": ".superclaw/cron-state.json",
    "jobs": [
      {
        "id": "daily-standup",
        "schedule": "0 9 * * 1-5",
        "agent": "secretary",
        "message": "Please prepare today's standup summary.",
        "enabled": true
      }
    ]
  }
}
```

### `browser`

Browser configuration for web-based tools.

```json
{
  "browser": {
    "headless": true,
    "proxy": "http://proxy.example.com:8080"
  }
}
```

### `plugins`

Plugin-specific configuration. Keys are plugin names, values are plugin-specific config objects.

```json
{
  "plugins": {
    "my-plugin": {
      "option1": "value1"
    }
  }
}
```
