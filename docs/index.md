---
layout: home

hero:
  name: SuperClaw
  text: Digital Workforce Framework
  tagline: Build your digital workforce in minutes, not months
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/SuperSupeng/SuperClaw

features:
  - icon: "\U0001F9E9"
    title: Six Primitives
    details: Agent, Team, Channel, Binding, Signal, Memory — everything you need to model a digital workforce, nothing more.
  - icon: "\u26A1"
    title: CLI-Native Tools
    details: Agents use CLI tools (gh, kubectl, jq, aws) as first-class citizens. No SDK wrappers — just the tools you already know.
  - icon: "\U0001F9E0"
    title: Memory & Knowledge
    details: Four-layer memory system with automatic decay and dream consolidation. Agents remember what matters, forget what doesn't.
  - icon: "\U0001F30D"
    title: Multi-Channel
    details: Deploy agents to CLI, Discord, Feishu (Lark), and more. One config, multiple communication channels.
---

## Quick Start

```bash
# Scaffold a new project
npx create-superclaw my-team

# Install and configure
cd my-team && pnpm install
cp .env.example .env  # Add your API key

# Start your digital workforce
pnpm dev
```

## Community

SuperClaw is built by contributors from around the world. We welcome participation in any language.

### Start Contributing

Pick a [Good First Issue](https://github.com/SuperSupeng/SuperClaw/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and dive in! Here are some popular areas:

| Area | Examples | Difficulty |
|------|----------|------------|
| Channel Adapters | [Slack #1](https://github.com/SuperSupeng/SuperClaw/issues/1), [WeChat Work #2](https://github.com/SuperSupeng/SuperClaw/issues/2) | Medium |
| Testing | [DingTalk Tests #4](https://github.com/SuperSupeng/SuperClaw/issues/4), [Telegram Tests #5](https://github.com/SuperSupeng/SuperClaw/issues/5) | Easy |
| CLI Tools | [Doctor #6](https://github.com/SuperSupeng/SuperClaw/issues/6), [Validate #13](https://github.com/SuperSupeng/SuperClaw/issues/13), [Dry-run #11](https://github.com/SuperSupeng/SuperClaw/issues/11) | Easy |
| Core | [JSON Schema #3](https://github.com/SuperSupeng/SuperClaw/issues/3), [Error Messages #8](https://github.com/SuperSupeng/SuperClaw/issues/8) | Easy |
| Docs & Examples | [Customer Support Example #10](https://github.com/SuperSupeng/SuperClaw/issues/10) | Easy |

### Guides

- [Contributing Guide (English)](https://github.com/SuperSupeng/SuperClaw/blob/main/CONTRIBUTING.md)
- [贡献指南 (中文)](https://github.com/SuperSupeng/SuperClaw/blob/main/CONTRIBUTING_zh.md)
