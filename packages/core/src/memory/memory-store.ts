// ============================================================================
// MemoryStore — MEMORY.md 解析与序列化
// ============================================================================

import type { MemoryEntry } from "@superclaw/types";

/**
 * 解析 MEMORY.md 内容为 MemoryEntry 数组
 * 按 `## ` 分割条目，从 HTML 注释中提取元数据
 */
export function parseMemoryFile(content: string): MemoryEntry[] {
  if (!content.trim()) return [];

  const sections = content.split(/^## /m).filter((s) => s.trim());
  const entries: MemoryEntry[] = [];

  for (const section of sections) {
    const lines = section.split("\n");
    const id = lines[0]?.trim() ?? "";
    if (!id) continue;

    // 提取 HTML 注释中的元数据
    const validUntilMatch = section.match(/<!-- valid_until: (.+?) -->/);
    const categoryMatch = section.match(/<!-- category: (.+?) -->/);
    const tagsMatch = section.match(/<!-- tags: (.+?) -->/);

    // 提取正文内容（排除 HTML 注释行和 ID 行）
    const contentLines = lines
      .slice(1)
      .filter((line) => !line.startsWith("<!--") || !line.includes("-->"))
      .filter((line) => !/^<!-- (valid_until|category|tags): .+? -->$/.test(line.trim()));
    const entryContent = contentLines.join("\n").trim();

    const entry: MemoryEntry = {
      id,
      content: entryContent,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (validUntilMatch) {
      entry.validUntil = validUntilMatch[1]!.trim();
    }
    if (categoryMatch) {
      const cat = categoryMatch[1]!.trim();
      if (cat === "fact" || cat === "judgment") {
        entry.category = cat;
      }
    }
    if (tagsMatch) {
      entry.tags = tagsMatch[1]!.trim().split(",").map((t) => t.trim()).filter(Boolean);
    }

    entries.push(entry);
  }

  return entries;
}

/**
 * 将 MemoryEntry 序列化为 Markdown 格式
 */
export function serializeMemoryEntry(entry: MemoryEntry): string {
  const parts: string[] = [];
  parts.push(`## ${entry.id}`);
  parts.push(entry.content);

  if (entry.validUntil) {
    parts.push(`<!-- valid_until: ${entry.validUntil} -->`);
  }
  if (entry.category) {
    parts.push(`<!-- category: ${entry.category} -->`);
  }
  if (entry.tags && entry.tags.length > 0) {
    parts.push(`<!-- tags: ${entry.tags.join(", ")} -->`);
  }

  return parts.join("\n") + "\n";
}
