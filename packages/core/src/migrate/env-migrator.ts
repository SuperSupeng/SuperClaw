// ============================================================================
// Env Migrator — 迁移 .env 文件
// ============================================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * 将 sourceDir/.env 复制到 targetDir/.env
 *
 * @returns 迁移的环境变量数量
 */
export async function migrateEnv(
  sourceDir: string,
  targetDir: string,
): Promise<{ count: number }> {
  const sourcePath = join(sourceDir, ".env");

  if (!existsSync(sourcePath)) {
    return { count: 0 };
  }

  const content = await readFile(sourcePath, "utf-8");

  // 确保目标目录存在
  const targetPath = join(targetDir, ".env");
  const targetDirPath = dirname(targetPath);
  if (!existsSync(targetDirPath)) {
    await mkdir(targetDirPath, { recursive: true });
  }

  await writeFile(targetPath, content, "utf-8");

  // 统计非空非注释行数
  const count = content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("#");
    }).length;

  return { count };
}
