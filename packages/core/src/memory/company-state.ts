// ============================================================================
// CompanyState — COMPANY-STATE.md 加载器
// ============================================================================

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * 加载 COMPANY-STATE.md，不存在返回空字符串
 */
export async function loadCompanyState(agentDir: string): Promise<string> {
  const filePath = join(agentDir, "COMPANY-STATE.md");
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    console.warn(`[company-state] COMPANY-STATE.md not found at ${filePath}`);
    return "";
  }
}
