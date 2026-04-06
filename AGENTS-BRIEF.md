# SuperClaw — 并行开发架构简报

> **本文档是给所有并行开发 Agent 的唯一参考。请完整阅读后再开始编码。**

## 项目概述

SuperClaw 是一个开源数字员工团队框架。用户通过配置 Agent / Team / Channel / Binding / Signal / Memory 六大原语来构建 7×24 运转的数字团队。

**技术栈**：Node.js 20+ / TypeScript (ESM) / pnpm workspace + turborepo

**当前目标（P0 Alpha）**：用户 `npx create-superclaw` 创建项目 → `superclaw dev` 启动 → Discord 上 Agent 能对话。

---

## Monorepo 结构

```
/data/develop/SuperClaw/
├── package.json              # root（private, pnpm workspace）
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── packages/
│   ├── types/                # @superclaw-ai/types — 共享类型（已完成）
│   ├── core/                 # @superclaw-ai/core — 核心运行时
│   ├── cli/                  # superclaw — CLI 工具
│   ├── channel-discord/      # @superclaw-ai/channel-discord
│   ├── channel-cli/          # @superclaw-ai/channel-cli
│   └── create-superclaw/     # create-superclaw 脚手架
├── docs/                     # VitePress 文档站
├── examples/                 # 示例项目
└── .github/workflows/        # CI
```

---

## 类型合同

**所有类型定义在 `packages/types/src/` 中，是不可修改的合同。**

### 核心接口速查

#### MessageAdapter（Channel 必须实现）
```typescript
interface MessageAdapter {
  readonly channelType: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(accountId: string, target: MessageTarget, message: OutgoingMessage): Promise<void>;
  onMessage(handler: (message: IncomingMessage) => void): void;
  getConnectedAccounts(): string[];
}
```

#### AgentRuntime（Core 实现）
```typescript
interface AgentRuntime {
  readonly config: AgentConfig;
  readonly instance: AgentInstance;
  boot(onProgress?: (progress: BootProgress) => void): Promise<void>;
  handleMessage(message: IncomingMessage): Promise<OutgoingMessage>;
  shutdown(): Promise<void>;
}
```

#### SuperClawApp（Core 实现，CLI 调用）
```typescript
interface SuperClawApp {
  readonly config: SuperClawConfig;
  readonly events: EventBus;
  start(): Promise<void>;
  stop(): Promise<void>;
  getAgent(agentId: string): AgentRuntime | undefined;
  getAllAgents(): AgentRuntime[];
}
```

#### ToolExecutor（每种工具类型实现）
```typescript
interface ToolExecutor {
  readonly toolType: "function" | "mcp" | "cli";
  initialize(): Promise<void>;
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;
  getToolDefinitions(): Promise<ToolDefinition[]>;
  dispose(): Promise<void>;
}
```

#### EventBus（Core 实现，全局事件总线）
```typescript
interface EventBus {
  on<E extends EventName>(event: E, handler: EventHandler<E>): void;
  off<E extends EventName>(event: E, handler: EventHandler<E>): void;
  emit<E extends EventName>(event: E, data: EventMap[E]): void;
  once<E extends EventName>(event: E, handler: EventHandler<E>): void;
}
```

### 关键类型文件

| 文件 | 内容 |
|------|------|
| `agent.ts` | AgentConfig, AgentInstance, AgentStatus, AgentTier |
| `model.ts` | ProviderConfig, ModelConfig, ModelCallOptions, ModelCallResult, ModelToolCall |
| `tool.ts` | ToolConfig (function/mcp/cli), ToolExecutor, ToolResult, ToolDefinition |
| `channel.ts` | ChannelConfig, ChannelAccountConfig, MessageAdapter |
| `message.ts` | IncomingMessage, OutgoingMessage, NextAction, DecisionType, MessageTarget |
| `binding.ts` | BindingConfig, BindingFilter |
| `signal.ts` | Signal, SignalTypeConfig, SignalPriority, SignalStatus |
| `memory.ts` | MemoryEntry, MemoryManager, MemoryFileType |
| `knowledge.ts` | KnowledgeSourceConfig, KnowledgeChunk, KnowledgeProvider |
| `config.ts` | SuperClawConfig（完整配置文件类型） |
| `runtime.ts` | AgentRuntime, SuperClawApp, BootStep, BootProgress |
| `events.ts` | EventMap, EventBus, EventHandler |
| `errors.ts` | SuperClawError, ErrorCodes |
| `package.ts` | AgentPackageManifest（Agent 打包标准） |

---

## 依赖关系图

```
@superclaw-ai/types（纯类型，无运行时依赖）
       ↑
@superclaw-ai/core（实现运行时：agent, model, gateway, router, config, memory, tool）
       ↑
@superclaw-ai/channel-discord（实现 MessageAdapter for Discord）
@superclaw-ai/channel-cli（实现 MessageAdapter for CLI/Terminal）
       ↑
superclaw（CLI 工具，组装 core + channels，提供命令行界面）

create-superclaw（脚手架，独立包，不依赖其他包）
```

---

## 各 Agent 任务详情

### Agent 1：Core — Agent Runtime + Model Provider

**负责文件**：`packages/core/src/agent/` + `packages/core/src/model/` + `packages/core/src/tool/`

**必须实现**：

1. **`agent/agent-loop.ts`** — Agent 核心循环
   - `createAgentRuntime(config: AgentConfig, deps: AgentDeps): AgentRuntime`
   - `AgentDeps` 包含：modelRouter, toolRegistry, memoryManager, eventBus
   - `handleMessage` 流程：
     1. 构建 system prompt（SOUL + 记忆 + 知识）
     2. 构建 messages 数组（历史 + 当前）
     3. 调用 `modelRouter.call()`
     4. 如果有 `toolCalls` → 执行工具 → 把结果追加到 messages → 再调用模型
     5. 返回 `OutgoingMessage`
   - 维护每个 Agent 的对话历史（内存中，按 senderId 分隔）

2. **`agent/boot-sequence.ts`** — 8 步启动
   - 按 `BootStep` 顺序执行
   - 每步失败不应阻断后续步骤（warn + 继续）
   - 构建 Agent 的初始 system prompt

3. **`agent/agent-manager.ts`** — 管理所有 Agent 实例
   - `createAgentManager(config, deps)` → 批量创建、启动、关闭
   - 根据 `AgentConfig[]` 创建 runtime 实例
   - 提供 `getAgent(id)` / `getAllAgents()` 查询

4. **`model/model-router.ts`** — 模型调用 + Fallback
   - `createModelRouter(providers: Record<string, ProviderConfig>)`
   - `call(modelConfig: ModelConfig, options: ModelCallOptions): Promise<ModelCallResult>`
   - primary 失败 → 按 fallbacks 顺序重试
   - 日志记录每次调用的 provider/model/耗时/token

5. **`model/providers/openai-compatible.ts`** — OpenAI 兼容 provider
   - 使用 Vercel AI SDK (`ai` 包) 的 `generateText` / `streamText`
   - 支持 `openai` 和 `anthropic` api 类型
   - 正确传递 tools 定义和处理 tool_calls 响应

6. **`tool/tool-registry.ts`** — 工具注册中心
   - 聚合所有 ToolExecutor，提供统一的 `execute(name, args)` 接口
   - 工具名冲突时 warn

7. **`tool/function-executor.ts`** — 函数工具执行器
   - 动态 import handler 模块，调用导出的函数

8. **`tool/cli-executor.ts`** — CLI 工具执行器（重要！）
   - 根据 CLIToolConfig 执行 shell 命令
   - 解析 JSON/text 输出
   - 超时处理
   - `getToolDefinitions()` 根据 subcommands 生成 LLM 可用的工具定义

**导出**：`packages/core/src/index.ts` 导出 `createAgentRuntime`, `createAgentManager`, `createModelRouter`, `createToolRegistry`

**依赖**：`ai`(Vercel AI SDK), `@superclaw-ai/types`, `pino`

---

### Agent 2：Core — Gateway + Router + Config

**负责文件**：`packages/core/src/gateway/` + `packages/core/src/router/` + `packages/core/src/config/` + `packages/core/src/app.ts`

**必须实现**：

1. **`config/loader.ts`** — 配置加载
   - `loadConfig(path?: string): Promise<SuperClawConfig>`
   - 支持 `superclaw.config.json` 和 `superclaw.config.yaml`
   - 自动查找（当前目录 → 上级目录）
   - 环境变量插值：`${ENV_VAR}` → `process.env.ENV_VAR`

2. **`config/schema.ts`** — Zod 校验
   - 为 `SuperClawConfig` 定义完整的 Zod schema
   - 友好的错误提示（哪个字段有问题、期望什么值）

3. **`gateway/server.ts`** — HTTP 服务器
   - 原生 `node:http` 实现（不引入 Express/Fastify）
   - 路由：`GET /health`, `POST /api/message`（webhook 入口）, `GET /api/agents`
   - 可选 auth token 校验

4. **`router/binding-table.ts`** — 绑定表
   - `createBindingTable(bindings: BindingConfig[])`
   - `resolve(channelType, accountId, message): AgentId | null`
   - 支持 filter 匹配和 priority 排序

5. **`router/message-queue.ts`** — 消息队列
   - 内存队列，per-agent
   - debounce 支持（合并短时间内同一来源的多条消息）
   - 队列满时丢弃最旧消息并 warn

6. **`router/router.ts`** — 路由核心
   - 接收 `IncomingMessage` → 查 binding table → 入队 → 分发给 Agent
   - 处理 Agent 回复 → 通过 Channel 发回
   - 连接 Channel（MessageAdapter）和 Agent（AgentRuntime）

7. **`app.ts`** — SuperClawApp 实现
   - `createApp(configPath?: string): Promise<SuperClawApp>`
   - 启动流程：loadConfig → createEventBus → createAgentManager → createRouter → registerChannels → startGateway → bootAllAgents → emit("system:ready")
   - 优雅关闭：SIGINT/SIGTERM → stop channels → stop agents → stop gateway

8. **`event-bus.ts`** — EventBus 实现
   - 基于 Node.js EventEmitter 的类型安全封装

**导出**：`packages/core/src/index.ts` 导出 `createApp`, `loadConfig`, `createEventBus`, `createRouter`, `createBindingTable`

**依赖**：`zod`, `yaml`, `@superclaw-ai/types`, `pino`

---

### Agent 3：Channel — Discord Adapter

**负责文件**：`packages/channel-discord/src/`

**必须实现**：

1. **`adapter.ts`** — `DiscordAdapter implements MessageAdapter`
   - 构造函数接收 `ChannelConfig`（type="discord"）
   - `connect()`: 为每个 account 创建一个 discord.js Client，登录
   - `disconnect()`: 所有 Client destroy
   - `sendMessage()`: 根据 MessageTarget 发送 DM 或群组消息
   - `onMessage()`: 注册消息处理器

2. **`client-manager.ts`** — 多 Bot Client 管理
   - 每个 account 对应一个独立的 discord.js Client
   - Client 的 intents: Guilds, GuildMessages, DirectMessages, MessageContent
   - 自动重连处理

3. **`message-converter.ts`** — 消息格式转换
   - Discord `Message` → `IncomingMessage`
   - `OutgoingMessage` → Discord 发送格式
   - 处理 mention、reply、attachment 转换
   - 生成唯一 message id

4. **`dm-handler.ts`** — DM 消息处理
   - 检查 dmPolicy（allow/deny/allowlist）
   - 检查 allowFrom

5. **`group-handler.ts`** — 群组消息处理
   - 检查 groupPolicy（mention/all/none）
   - mention 模式：只响应 @Bot 的消息
   - 处理 reply chain

6. **`index.ts`** — 导出 `DiscordAdapter`

**关键注意事项**：
- discord.js v14 需要 `GatewayIntentBits`
- 多 Bot 意味着多个 Client 实例，每个独立登录
- DM channel 需要 `channel.isDMBased()` 判断
- 群组中处理 `message.mentions.has(client.user)` 判断是否 @Bot
- 消息内容需要去掉 mention 标记 `<@botId>` 再传给 Agent

---

### Agent 4：CLI + create-superclaw

**负责文件**：`packages/cli/src/` + `packages/create-superclaw/src/` + `packages/create-superclaw/templates/`

#### Part A: CLI（superclaw 命令）

1. **`cli.ts`** — 入口
   - 使用 `cac` 库注册命令
   - 版本号从 package.json 读取

2. **`commands/dev.ts`** — `superclaw dev`
   - 加载配置 → `createApp()` → `app.start()`
   - 启用 CLI channel（终端可直接和 Agent 对话）
   - 输出启动信息（Agent 数量、渠道状态、端口）

3. **`commands/start.ts`** — `superclaw start`
   - 生产模式启动，类似 dev 但不启用 CLI channel
   - 日志输出到文件

4. **`commands/init.ts`** — `superclaw init`
   - 在当前目录初始化项目（类似 create-superclaw 但更简单）
   - 生成 `superclaw.config.json` + 一个示例 Agent 目录

5. **`commands/add-agent.ts`** — `superclaw add agent <name>`
   - 创建 Agent 目录 + SOUL.md 模板
   - 更新 superclaw.config.json 添加 agent 条目

#### Part B: create-superclaw 脚手架

1. **`src/index.ts`** — `npx create-superclaw`
   - 使用 `@clack/prompts` 交互式引导
   - 问题：项目名 → Agent 名 → 选择渠道（Discord/CLI） → API Key 配置
   - 从 templates 复制文件 → 替换变量 → 安装依赖提示

2. **`templates/basic/`** — 单 Agent 模板
   ```
   basic/
   ├── superclaw.config.json
   ├── agents/
   │   └── assistant/
   │       └── SOUL.md
   ├── package.json
   └── .env.example
   ```

3. **`templates/team/`** — 团队模板
   ```
   team/
   ├── superclaw.config.json
   ├── agents/
   │   ├── secretary/SOUL.md
   │   ├── researcher/SOUL.md
   │   └── writer/SOUL.md
   ├── package.json
   └── .env.example
   ```

**CLI 输出风格**：使用 `picocolors` 着色。简洁、清晰。参考 Vite 的 CLI 输出风格。

---

### Agent 5：Core — Memory + Signal 系统

**负责文件**：`packages/core/src/memory/` + `packages/core/src/knowledge/` + `packages/core/src/signal/`

**必须实现**：

1. **`memory/memory-manager.ts`** — 记忆管理器
   - `createMemoryManager(): MemoryManager`
   - 实现 `MemoryManager` 接口
   - 读取 Markdown 文件，解析 YAML frontmatter

2. **`memory/soul-loader.ts`** — SOUL.md 加载器
   - 读取 Agent 的 SOUL.md 文件，返回纯文本
   - 如果文件不存在，返回默认人格模板

3. **`memory/memory-store.ts`** — MEMORY.md 读写
   - 解析 MEMORY.md 中的结构化条目
   - 支持追加新条目
   - 每个条目格式：`## {id}\n{content}\n<!-- valid_until: {date} -->`

4. **`memory/heartbeat-loader.ts`** — HEARTBEAT.md 加载
   - 读取心跳任务清单

5. **`memory/company-state.ts`** — COMPANY-STATE.md 加载
   - 读取组织状态文件

6. **`memory/decay.ts`** — 记忆衰减
   - 扫描 MEMORY.md，过滤掉 valid_until 过期的条目
   - 返回过期条目数量

7. **`knowledge/knowledge-loader.ts`** — 知识源统一加载
   - `createKnowledgeLoader(sources: KnowledgeSourceConfig[])`
   - 根据 type 分发到对应 provider
   - P0 只实现 local-files

8. **`knowledge/sources/local-files.ts`** — 本地文件知识源
   - 实现 `KnowledgeProvider` 接口
   - 读取指定目录下的 .md/.txt 文件
   - `query()`: 简单的关键词匹配（P0 不需要 embedding）
   - `sync()`: 扫描文件变更

9. **`signal/signal-bus.ts`** — 信号总线（基础版）
   - `createSignalBus(eventBus: EventBus)`
   - `send(signal): void` — 创建信号，emit 事件
   - `consume(agentId, signalType): Signal[]` — 消费指定 Agent 的信号
   - `getPending(agentId): Signal[]` — 获取待处理信号
   - 信号存储在内存中（P0 不需要持久化）

**导出**：`createMemoryManager`, `createKnowledgeLoader`, `createSignalBus`

---

### Agent 6：文档站 + Examples + CI

**负责文件**：`docs/` + `examples/` + `.github/` + 根目录文档

#### Part A: VitePress 文档站

1. **`docs/package.json`** + **`docs/.vitepress/config.ts`**
   - VitePress 配置，英文为主，中文注释

2. **`docs/index.md`** — 首页
   - Hero：tagline "Build your digital workforce in minutes"
   - Features：3-4 个核心卖点

3. **`docs/guide/getting-started.md`** — 快速开始
   - 5 分钟从 0 到 Agent 在 Discord 上对话
   - 步骤：安装 → 创建项目 → 配置 → 启动

4. **`docs/guide/concepts.md`** — 核心概念
   - 六大原语的解释 + 图示

5. **`docs/guide/configuration.md`** — 配置参考
   - superclaw.config.json 的完整字段说明

6. **`docs/guide/cli-tools.md`** — CLI 工具集成
   - 如何让 Agent 使用 CLI 工具（gh, feishu-cli 等）
   - 这是 SuperClaw 的差异化卖点之一

#### Part B: Examples

1. **`examples/single-agent/`** — 最简示例
   - 一个 Agent + Discord channel
   - 完整可运行

2. **`examples/team/`** — 团队示例
   - 3 个 Agent + Team 定义
   - 展示 delegation

#### Part C: CI + 根目录文件

1. **`.github/workflows/ci.yml`** — CI
   - trigger: push to main, PRs
   - steps: install → typecheck → lint → test → build

2. **`.gitignore`** — 标准 Node.js + 自定义

3. **`CONTRIBUTING.md`** — 贡献指南

4. **根目录 `README.md`** — 项目介绍（面向开源社区）
   - Logo placeholder
   - 一句话介绍
   - Quick Start（3 步）
   - 核心概念概览
   - 链接到文档站

---

## 编码规范

1. **ESM only**：所有 import 使用 `.js` 后缀（TypeScript ESM 要求）
2. **纯函数工厂**：用 `createXxx()` 工厂函数而非 class（除非需要 `implements`）
3. **日志**：使用 `pino` logger，通过参数注入（不 import 全局实例）
4. **错误处理**：使用 `ErrorCodes` 中的预定义错误码创建 `SuperClawError`
5. **无默认导出**：所有模块使用 named export
6. **类型导入**：使用 `import type` 导入纯类型

---

## 集成点约定

### Channel → Router
Channel 通过 `onMessage(handler)` 把 `IncomingMessage` 交给 Router。
Router 通过 `channel.sendMessage(accountId, target, response)` 发回回复。

### Router → Agent
Router 查 binding table 找到 agentId → 从 AgentManager 取 runtime → 调用 `runtime.handleMessage(msg)`。

### Agent → Model
Agent 通过 `modelRouter.call(config, options)` 调用模型。modelRouter 处理 fallback。

### Agent → Tools
Agent 通过 `toolRegistry.execute(name, args)` 执行工具。toolRegistry 分发到对应 executor。

### CLI 命令 → App
CLI 的 `dev`/`start` 命令调用 `createApp()` → `app.start()`。createApp 内部组装所有模块。

---

## 注意事项

- **不要修改 `packages/types/`**——这是已确定的合同
- **不要引入额外依赖**——除非 package.json 中已声明
- **环境变量插值**：配置文件中 `${VAR}` 格式，由 config/loader.ts 处理
- **P0 范围**：不需要实现热更新、完整的 Team 编排、MCP executor。把接口留好，实现标注 `// TODO: P1`
