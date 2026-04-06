// ============================================================================
// parseDuration — 将 "5m", "1h", "1d" 解析为毫秒数
// ============================================================================

/**
 * 解析时间字符串为毫秒数
 * 支持格式: "5s", "5m", "1h", "1d"
 * 无法解析时返回 0
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}
