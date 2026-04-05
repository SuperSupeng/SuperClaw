// ============================================================================
// EventBus — 类型安全的事件总线
// ============================================================================

import { EventEmitter } from "node:events";
import type { EventBus, EventMap, EventName, EventHandler } from "@superclaw/types";

/**
 * 创建事件总线实例
 * 基于 Node.js EventEmitter 封装，提供类型安全的事件 API
 */
export function createEventBus(): EventBus {
  const emitter = new EventEmitter();
  // 提高默认最大监听器数量，避免生产环境警告
  emitter.setMaxListeners(100);

  return {
    on<E extends EventName>(event: E, handler: EventHandler<E>): void {
      emitter.on(event, handler as (...args: unknown[]) => void);
    },

    off<E extends EventName>(event: E, handler: EventHandler<E>): void {
      emitter.off(event, handler as (...args: unknown[]) => void);
    },

    emit<E extends EventName>(event: E, data: EventMap[E]): void {
      emitter.emit(event, data);
    },

    once<E extends EventName>(event: E, handler: EventHandler<E>): void {
      emitter.once(event, handler as (...args: unknown[]) => void);
    },
  };
}
