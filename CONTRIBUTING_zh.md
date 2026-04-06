# SuperClaw 贡献指南

[English](./CONTRIBUTING.md)

感谢你对 SuperClaw 的关注！无论你的经验水平如何，我们都欢迎来自全球开发者的贡献。本指南将帮助你快速上手。

## 目录

- [行为准则](#行为准则)
- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [开发流程](#开发流程)
- [编码规范](#编码规范)
- [提交变更](#提交变更)
- [报告问题](#报告问题)
- [社区](#社区)

## 行为准则

我们致力于为每位参与者提供友好、包容的体验。请在所有交流中保持尊重、建设性和耐心。

## 开发环境搭建

### 前置条件

- **Node.js** >= 20
- **pnpm** >= 10（项目使用 pnpm workspace）
- **Git**

### 快速开始

```bash
# Fork 并克隆仓库
git clone https://github.com/<your-username>/SuperClaw.git
cd SuperClaw

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm typecheck
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm build` | 构建所有包（通过 Turborepo） |
| `pnpm dev` | 以监听模式运行所有包 |
| `pnpm test` | 运行所有测试 |
| `pnpm typecheck` | 对所有包进行类型检查 |
| `pnpm clean` | 清除所有构建产物和 node_modules |

## 项目结构

```
SuperClaw/
├── packages/
│   ├── core/              # @superclaw/core — 核心运行时引擎
│   ├── cli/               # superclaw — 命令行工具
│   ├── types/             # @superclaw/types — 共享类型定义
│   ├── channel-cli/       # @superclaw/channel-cli — 终端适配器
│   ├── channel-discord/   # @superclaw/channel-discord — Discord 适配器
│   ├── channel-feishu/    # @superclaw/channel-feishu — 飞书适配器
│   └── create-superclaw/  # create-superclaw — 项目脚手架
├── docs/                  # VitePress 文档站
├── examples/
│   ├── single-agent/      # 单 Agent 最简示例
│   └── team/              # 多 Agent 团队示例
└── .github/workflows/     # CI/CD 配置
```

### 包依赖关系

```
@superclaw/types  （纯类型，无运行时依赖）
       ↑
@superclaw/core   （运行时：agent、model、router、memory、signal、tools）
       ↑
channel-*         （MessageAdapter 各渠道实现）
       ↑
superclaw CLI     （组装 core + channels，提供命令行界面）

create-superclaw  （独立脚手架工具）
```

## 开发流程

### 开发单个包

```bash
# 构建并测试单个包
cd packages/core
pnpm build
pnpm test

# 监听模式开发
pnpm dev
```

### 运行完整项目

```bash
# 先构建所有包
pnpm build

# 运行示例项目
cd examples/single-agent
pnpm dev
```

### 添加新的渠道适配器

1. 参照 `channel-cli` 的结构创建 `packages/channel-<name>/`
2. 实现 `@superclaw/types` 中的 `MessageAdapter` 接口
3. 将新包添加到 `pnpm-workspace.yaml`
4. 在核心配置 schema 中注册渠道类型
5. 编写测试和文档

## 编码规范

### TypeScript

- **仅限 ESM** — 所有 import 使用 `.js` 后缀（TypeScript ESM 要求）
- **严格模式** — 通过 `tsconfig.base.json` 启用
- **仅命名导出** — 不使用 default export
- **类型导入** — 纯类型使用 `import type`
- **工厂函数** — 优先使用 `createXxx()` 而非 class（除非需要实现接口）

### 代码风格

- 一个文件专注一个概念
- 通过依赖注入使用 `pino` logger（不使用全局实例）
- 通过 `SuperClawError` + 预定义 `ErrorCodes` 处理错误
- 组合优于继承

### 测试

- 使用 **Vitest** 编写所有测试
- 测试文件放在源文件旁（`*.test.ts`）
- 测试公开 API，而非实现细节
- Mock 外部依赖（LLM 调用、文件系统、网络）

## 提交变更

### Pull Request 流程

1. **Fork** 仓库并从 `main` 创建分支
   ```bash
   git checkout -b feat/my-feature
   ```
2. **编写代码**，保持每次提交清晰、聚焦
3. **添加测试**
4. **推送前运行所有检查**：
   ```bash
   pnpm typecheck
   pnpm build
   pnpm test
   ```
5. **Push** 并创建 Pull Request
6. **填写 PR 描述** — 说明改了什么以及为什么
7. **等待审查** — 维护者会 review 你的 PR

### Commit 消息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

feat(core): add MCP tool discovery
fix(discord): handle reconnection on token refresh
docs: update getting started guide
test(router): add binding table edge cases
ci: add Node.js 22 to test matrix
```

类型：`feat`、`fix`、`docs`、`test`、`ci`、`refactor`、`perf`、`chore`

### PR 指南

- 保持 PR 小而聚焦（每个 PR 一个功能或修复）
- 关联相关 issue：`Fixes #123` 或 `Relates to #123`
- 确保 CI 通过后再请求审查
- 积极响应审查反馈

## 报告问题

### Bug 报告

请在 Issue 中提供：

1. **复现步骤** — 尽量提供最小复现
2. **预期行为**
3. **实际行为**
4. **环境信息** — Node.js 版本、操作系统、包版本

### 功能建议

请在 Issue 中描述：

1. **你要解决的问题**
2. **你提议的方案**
3. **你考虑过的替代方案**

## 社区

- **GitHub Issues** — Bug 报告、功能建议
- **GitHub Discussions** — 问题、想法、作品展示
- **Pull Requests** — 代码贡献

为了让全球开发者都能参与，我们主要使用英文交流，但你也可以使用中文提交 Issue 或参与讨论。

## 许可证

向 SuperClaw 贡献代码即表示你同意你的贡献将按照 [Apache License 2.0](./LICENSE) 进行许可。
