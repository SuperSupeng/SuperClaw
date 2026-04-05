// ============================================================================
// Knowledge — 知识源
// ============================================================================
// Agent 的核心价值之一：接入用户的知识体系。
// "Agent + 你的知识 = 你的数字员工"
//
// 知识源是可插拔的。框架内置 local-files，其他通过 provider 扩展。
// ============================================================================

/** 内置知识源类型 */
export type BuiltinKnowledgeSourceType =
  | "local-files"   // 本地文件 / Obsidian
  | "notion"        // Notion
  | "feishu-docs"   // 飞书文档
  | "github"        // GitHub 仓库
  | "web"           // 网页抓取
  | "custom";       // 自定义

/** 知识同步策略 */
export type KnowledgeSyncStrategy = "realtime" | "daily" | "manual";

/** 知识源配置 */
export interface KnowledgeSourceConfig {
  /** 知识源类型 */
  type: string;
  /** 知识源名称 */
  name: string;
  /** 同步策略 */
  sync: KnowledgeSyncStrategy;
  /** 类型特有的配置 */
  config: Record<string, unknown>;
}

/** 知识片段（检索结果） */
export interface KnowledgeChunk {
  /** 片段 ID */
  id: string;
  /** 内容 */
  content: string;
  /** 来源文件/URL */
  source: string;
  /** 相关度分数 */
  score?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/** 知识源 Provider 接口——每种知识源类型必须实现 */
export interface KnowledgeProvider {
  readonly sourceType: string;

  /** 初始化连接 */
  initialize(config: KnowledgeSourceConfig): Promise<void>;

  /** 检索知识 */
  query(query: string, limit?: number): Promise<KnowledgeChunk[]>;

  /** 同步知识（增量） */
  sync(): Promise<{ added: number; updated: number; removed: number }>;

  /** 清理资源 */
  dispose(): Promise<void>;
}
