// ============================================================================
// Memory — 记忆系统
// ============================================================================
// 文件驱动的分层记忆系统，可 git 追踪。
//
// 四个层级：
// - SOUL.md        — 角色定义、行为准则（极少变）
// - COMPANY-STATE.md — 组织状态、当日简报（每天更新）
// - MEMORY.md      — 长期记忆、不可推导的判断（按需写入）
// - HEARTBEAT.md   — 心跳任务、定期检查清单（周级调整）
//
// 记忆写入规则：
// 1. 能从现有资料推导的 → 不存
// 2. 有保质期的打 valid_until → 过期自动降权
// 3. 事实（短命）vs 判断（长寿）→ 优先沉淀判断
// ============================================================================

/** 记忆文件类型 */
export type MemoryFileType = "soul" | "company-state" | "long-term" | "heartbeat";

/** 单条记忆条目 */
export interface MemoryEntry {
  /** 条目 ID */
  id: string;
  /** 内容 */
  content: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 有效期（ISO 日期字符串，过期后降权） */
  validUntil?: string;
  /** 类型：事实 vs 判断 */
  category?: "fact" | "judgment";
  /** 标签 */
  tags?: string[];
}

/** 记忆管理器接口 */
export interface MemoryManager {
  /** 加载指定类型的记忆文件 */
  load(agentDir: string, type: MemoryFileType): Promise<string>;

  /** 写入记忆条目 */
  write(agentDir: string, type: MemoryFileType, entry: MemoryEntry): Promise<void>;

  /** 读取所有有效记忆（自动过滤过期） */
  getValidEntries(agentDir: string, type: MemoryFileType): Promise<MemoryEntry[]>;

  /** 清理过期记忆 */
  decay(agentDir: string): Promise<number>;
}
