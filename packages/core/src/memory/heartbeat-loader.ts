// ============================================================================
// HeartbeatLoader — HEARTBEAT.md 加载器
// ============================================================================

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 加载 HEARTBEAT.md，不存在返回空字符串
 */
export async function loadHeartbeat(agentDir: string): Promise<string> {
  const filePath = join(agentDir, "HEARTBEAT.md");
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    console.warn(`[heartbeat-loader] HEARTBEAT.md not found at ${filePath}`);
    return "";
  }
}
