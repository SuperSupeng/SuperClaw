# Getting Started

Get your first SuperClaw agent running in under 5 minutes.

## Prerequisites

- **Node.js** >= 20
- **pnpm** (recommended) or npm

## Step 1: Scaffold a Project

```bash
npx create-superclaw my-team
```

The CLI will walk you through:

1. **Choose a template** — `single-agent` (minimal) or `team` (multi-agent with delegation)
2. **Configure your API key** — Provide your OpenAI / Anthropic / other LLM provider key
3. **Pick your channels** — CLI (default), Discord, Feishu, etc.

## Step 2: Install Dependencies

```bash
cd my-team
pnpm install
```

## Step 3: Set Up Environment

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=sk-...
```

## Step 4: Start the Agent

```bash
pnpm dev
```

Your agent will boot up and start listening on the CLI channel. Type a message and press Enter to chat.

```
┌─────────────────────────────────┐
│  SuperClaw v0.1.0               │
│  Agent: assistant (ready)       │
│  Channel: cli                   │
└─────────────────────────────────┘

You > Hello!
assistant > Hi there! How can I help you today?
```

## Step 5 (Optional): Connect Discord

To let your agent respond in a Discord server:

1. Create a Discord bot at [discord.com/developers](https://discord.com/developers)
2. Add the token to `.env`:

```env
DISCORD_TOKEN=your-bot-token
```

3. Add a Discord channel in `superclaw.config.json`:

```json
{
  "channels": {
    "my-discord": {
      "type": "discord",
      "token": { "env": "DISCORD_TOKEN" }
    }
  }
}
```

4. Create a binding to wire the agent to Discord:

```json
{
  "bindings": [
    { "agent": "assistant", "channel": "my-discord" }
  ]
}
```

5. Restart with `pnpm dev` — your agent is now live in Discord.

## Next Steps

- [Core Concepts](/guide/concepts) — Understand the six primitives
- [Configuration Reference](/guide/configuration) — Full config file documentation
- [CLI Tools](/guide/cli-tools) — Let your agents use CLI tools like `gh`, `jira`, etc.
