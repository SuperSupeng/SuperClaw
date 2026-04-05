// ============================================================================
// SoulLoader — SOUL.md 加载器
// ============================================================================

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_SOUL = `# Assistant

You are a helpful AI assistant powered by SuperClaw.

## Guidelines
- Be helpful, accurate, and concise
- Ask clarifying questions when needed
- Be honest about limitations
`;

/**
 * 加载 SOUL.md，不存在则返回默认模板
 */
export async function loadSoul(agentDir: string): Promise<string> {
  const filePath = join(agentDir, "SOUL.md");
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    console.warn(`[soul-loader] SOUL.md not found at ${filePath}, using default template`);
    return DEFAULT_SOUL;
  }
}
