// ============================================================================
// @superclaw/types — 统一类型导出
// ============================================================================
// 这是 SuperClaw 所有模块的共享类型合同。
// 所有子包（core, cli, channel-*, create-superclaw）都依赖此包。
// ============================================================================

// 六大原语
export type * from "./agent.js";
export type * from "./team.js";
export type * from "./channel.js";
export type * from "./binding.js";
export type * from "./signal.js";
export type * from "./memory.js";

// 支撑类型
export type * from "./model.js";
export type * from "./tool.js";
export type * from "./knowledge.js";
export type * from "./message.js";
export type * from "./config.js";
export type * from "./package.js";

// 运行时接口
export type * from "./runtime.js";
export type * from "./events.js";

// 错误类型（需要导出值，不能用 type-only）
export { ErrorCodes } from "./errors.js";
export type * from "./errors.js";
