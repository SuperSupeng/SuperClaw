// ============================================================================
// Package — Agent 打包标准
// ============================================================================
// 定义一个可分发、可安装的 Agent 包的结构。
// 用于未来的 Agent Store：开发者造 Agent → 发布 → 用户安装 → 接入知识。
//
// 目录结构：
// my-agent/
// ├── agent.json        # 包元信息
// ├── SOUL.md           # 人格定义
// ├── sops/             # 标准操作流程
// │   └── *.md
// ├── tools/            # 自带工具
// │   └── *.ts
// └── README.md         # Store 展示页
// ============================================================================

import type { AgentTier } from "./agent.js";
import type { ToolConfig } from "./tool.js";
// KnowledgeSourceConfig reserved for future use

/** Agent 包元信息（agent.json） */
export interface AgentPackageManifest {
  /** 包名（npm 风格，如 "@superclaw-agents/secretary"） */
  name: string;
  /** 版本号（semver） */
  version: string;
  /** 描述 */
  description: string;
  /** 作者 */
  author: string;
  /** 许可证 */
  license?: string;
  /** 标签 */
  tags?: string[];
  /** Agent 层级 */
  tier: AgentTier;
  /** 所需工具 */
  tools?: ToolConfig[];
  /** 推荐的知识源类型 */
  recommendedKnowledge?: string[];
  /** 依赖的其他 Agent 包 */
  dependencies?: Record<string, string>;
  /** 最低 SuperClaw 版本 */
  superclaw?: string;
  /** 人格文件路径（相对于包根目录） */
  soul?: string;
  /** SOP 目录路径 */
  sops?: string;
}
