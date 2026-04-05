// ============================================================================
// Binding Table — 绑定表（Channel Account → Agent 映射）
// ============================================================================

import type { BindingConfig, IncomingMessage } from "@superclaw/types";

/** BindingTable 接口 */
export interface BindingTable {
  /**
   * 根据渠道、账号、消息内容解析目标 agentId
   * @returns 匹配的 agentId，无匹配返回 null
   */
  resolve(channelType: string, accountId: string, message: IncomingMessage): string | null;
}

/**
 * 创建绑定表
 *
 * 匹配逻辑：
 * 1. channel + account 精确匹配
 * 2. 应用 filter（sourceTypes, groupIds, senderIds, contentPattern）
 * 3. 多条匹配取 priority 最高（priority 数值越大优先级越高）
 */
export function createBindingTable(bindings: BindingConfig[]): BindingTable {
  return {
    resolve(channelType: string, accountId: string, message: IncomingMessage): string | null {
      let bestMatch: BindingConfig | null = null;
      let bestPriority = -Infinity;

      for (const binding of bindings) {
        // 1. 精确匹配 channel + account
        if (binding.channel !== channelType || binding.account !== accountId) {
          continue;
        }

        // 2. 应用 filter
        if (binding.filter) {
          const f = binding.filter;

          // sourceTypes 过滤
          if (f.sourceTypes && f.sourceTypes.length > 0) {
            if (!f.sourceTypes.includes(message.sourceType as "dm" | "group" | "channel")) {
              continue;
            }
          }

          // groupIds 过滤
          if (f.groupIds && f.groupIds.length > 0) {
            if (!message.groupId || !f.groupIds.includes(message.groupId)) {
              continue;
            }
          }

          // senderIds 过滤
          if (f.senderIds && f.senderIds.length > 0) {
            if (!f.senderIds.includes(message.senderId)) {
              continue;
            }
          }

          // contentPattern 过滤
          if (f.contentPattern) {
            try {
              const regex = new RegExp(f.contentPattern);
              if (!regex.test(message.content)) {
                continue;
              }
            } catch {
              // 无效正则，跳过此 filter
              continue;
            }
          }
        }

        // 3. 取 priority 最高
        const priority = binding.priority ?? 0;
        if (priority > bestPriority) {
          bestPriority = priority;
          bestMatch = binding;
        }
      }

      return bestMatch?.agent ?? null;
    },
  };
}
