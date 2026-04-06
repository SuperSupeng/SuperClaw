# SuperClaw

**首个开源数字组织构建框架——不只是 Agent，而是整个团队。**

[![CI](https://github.com/SuperSupeng/SuperClaw/actions/workflows/ci.yml/badge.svg)](https://github.com/SuperSupeng/SuperClaw/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@superclaw-ai/core.svg)](https://www.npmjs.com/package/@superclaw-ai/core)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

[English](./README.md) | 中文

大多数 Agent 框架只给你一个智能循环。SuperClaw 给你一张组织架构图——有角色、汇报线、异步通信和像真实公司一样会衰减的机构记忆。用配置定义你的数字员工团队，接入渠道（CLI、Discord、飞书），让他们协作。

## 快速开始

```bash
# 1. 创建项目
npx create-superclaw my-team

# 2. 安装并配置
cd my-team && pnpm install
cp .env.example .env   # 填入你的 API Key

# 3. 启动
pnpm dev
```

## 六大原语

SuperClaw 的一切都由六个概念构成：

| 原语 | 作用 |
|------|------|
| **Agent** | 持久化的 AI 角色，拥有人格（SOUL.md）、工具和模型。三个层级：Executive、Coordinator、Worker。 |
| **Team** | 将 Agent 分组，定义协作规则和汇报结构。 |
| **Channel** | 通信接口（CLI、Discord、飞书等）。 |
| **Binding** | 将 Agent 绑定到 Channel。 |
| **Signal** | Agent 间的异步消息，用于委派和协调，支持 SLA 追踪。 |
| **Memory** | 四层文件制记忆：SOUL、COMPANY-STATE、MEMORY、HEARTBEAT。 |

## 设计理念

**沙漏原则** — 人是瓶颈，而非 Agent。Type 1 决策（不可逆：预算审批、公开声明）需要人签字。Type 2 决策（可逆：草拟、调研、排期）完全自主。框架强制执行这个边界。

**球权原则** — 每次交互都以明确的下一步行动结束，指定给特定的一方。没有"如果需要随时找我"的死胡同。Agent 完成一个回合后，要么把球传给另一个 Agent，要么还给人类，要么安排后续跟进。

**分层加载** — Agent 分 8 步启动，渐进式加载上下文：组织状态、人格、知识、焦点，然后是信号。这样 token 预算就紧凑了——Agent 只加载当前任务需要的内容。

**记忆衰减** — 过期记忆自动清理。空闲时 `autoDream` 把碎片记忆整合为持久知识。没有无限上下文窗口，没有过期数据。

## 架构

```
                         Channels
                    +------+------+------+
                    | CLI  | Discord | 飞书 |
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

## 核心特性

- **CLI 工具一等公民** — Agent 直接调用 `gh`、`kubectl`、`jq`、`aws`。不需要 SDK 封装。
- **热重载** — 修改 `superclaw.config.json`，Agent 实时重新配置，无需重启。
- **MCP 支持** — Model Context Protocol 集成，实现工具发现和执行。
- **挑战指令** — Agent 会指出人类行为与声明的价值观或目标之间的偏差。
- **定时调度** — Agent 可以按计划运行，不仅仅响应消息。
- **OpenClaw 迁移** — 内置解析器和转换器，支持现有 OpenClaw 项目迁移。

## 包列表

| 包 | 说明 |
|-----|------|
| `@superclaw-ai/core` | 运行时引擎、Agent 生命周期、路由、信号总线 |
| `@superclaw-ai/cli` | CLI 工具（`superclaw dev`、`superclaw start`） |
| `@superclaw-ai/types` | 共享 TypeScript 类型定义 |
| `@superclaw-ai/channel-cli` | 终端渠道适配器 |
| `@superclaw-ai/channel-discord` | Discord 渠道适配器 |
| `@superclaw-ai/channel-feishu` | 飞书渠道适配器 |
| `@superclaw-ai/channel-dingtalk` | 钉钉渠道适配器 |
| `@superclaw-ai/channel-telegram` | Telegram 渠道适配器 |
| `create-superclaw` | 项目脚手架工具 |

## 文档

- [快速开始](https://superclaw.dev/guide/getting-started)
- [核心概念](https://superclaw.dev/guide/concepts)
- [配置参考](https://superclaw.dev/guide/configuration)
- [CLI 工具集成](https://superclaw.dev/guide/cli-tools)

## 参与贡献

请查看 [贡献指南](./CONTRIBUTING_zh.md) 了解开发环境搭建和贡献规范。

## 许可证

[Apache License 2.0](./LICENSE)
