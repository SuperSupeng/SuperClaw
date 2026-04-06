// ============================================================================
// Config Watcher — 配置文件热更新监听
// ============================================================================

import { watch, type FSWatcher } from "node:fs";
import type { EventBus } from "@superclaw/types";
import type { Logger } from "pino";
import { loadConfig } from "./loader.js";
import { diffConfig } from "./diff.js";
import type { ConfigDiff } from "./diff.js";

/** 配置监听器接口 */
export interface ConfigWatcher {
  /** 开始监听 */
  start(): void;
  /** 停止监听 */
  stop(): void;
}

/**
 * 创建配置文件监听器
 *
 * 监听配置文件变更，自动 diff 并通过 EventBus 通知变更
 *
 * @param configPath - 配置文件绝对路径
 * @param eventBus - 事件总线
 * @param logger - pino logger
 * @param onDiff - diff 结果回调（供 app 做增量更新）
 */
export function createConfigWatcher(
  configPath: string,
  eventBus: EventBus,
  logger: Logger,
  onDiff?: (diff: ConfigDiff, configPath: string) => void | Promise<void>,
): ConfigWatcher {
  const log = logger.child({ module: "config-watcher" });

  let fsWatcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentConfigSnapshot: string | null = null;

  /**
   * 处理文件变更事件
   * debounce 100ms，文件保存可能触发多次事件
   */
  function handleFileChange(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      reloadAndDiff().catch((err: unknown) => {
        log.error({ err }, "Failed to reload config after file change");
      });
    }, 100);
  }

  /**
   * 重新加载配置并计算 diff
   */
  async function reloadAndDiff(): Promise<void> {
    try {
      const oldSnapshot = currentConfigSnapshot;

      // 重新加载
      const newConfig = await loadConfig(configPath);
      const newSnapshot = JSON.stringify(newConfig);

      // 快速判断：如果序列化完全相同，跳过
      if (newSnapshot === oldSnapshot) {
        log.debug("Config file changed but content is identical, skipping");
        return;
      }

      // 如果是首次加载后的变更，需要用旧快照反序列化
      if (oldSnapshot === null) {
        // 首次变更，没有旧配置可 diff，仅更新快照
        currentConfigSnapshot = newSnapshot;
        log.info("Config snapshot initialized");
        return;
      }

      const oldParsed = JSON.parse(oldSnapshot) as typeof newConfig;
      const diff = diffConfig(oldParsed, newConfig);

      if (!diff.hasChanges) {
        log.debug("Config reloaded but no effective changes detected");
        currentConfigSnapshot = newSnapshot;
        return;
      }

      log.info(
        {
          agentsAdded: diff.agents.added.length,
          agentsRemoved: diff.agents.removed.length,
          agentsModified: diff.agents.modified.length,
          channelsAdded: diff.channels.added.length,
          channelsRemoved: diff.channels.removed.length,
          channelsModified: diff.channels.modified.length,
          bindingsChanged: diff.bindings.changed,
          providersChanged: diff.providers.changed,
          gatewayChanged: diff.gateway.changed,
          routerChanged: diff.router.changed,
        },
        "Config change detected",
      );

      // 更新快照
      currentConfigSnapshot = newSnapshot;

      // 通知事件总线
      eventBus.emit("config:changed", { path: configPath });

      // 回调 diff 结果，供 app 做增量更新
      if (onDiff) {
        await onDiff(diff, configPath);
      }
    } catch (err) {
      log.error({ err }, "Error during config reload and diff");
    }
  }

  return {
    start(): void {
      if (fsWatcher) {
        log.warn("Config watcher already started");
        return;
      }

      // 初始化当前配置快照
      loadConfig(configPath)
        .then((config) => {
          currentConfigSnapshot = JSON.stringify(config);
          log.info({ configPath }, "Config watcher started");
        })
        .catch((err: unknown) => {
          log.error({ err }, "Failed to load initial config snapshot");
        });

      fsWatcher = watch(configPath, (eventType) => {
        if (eventType === "change") {
          handleFileChange();
        }
      });

      fsWatcher.on("error", (err) => {
        log.error({ err }, "Config file watcher error");
      });
    },

    stop(): void {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (fsWatcher) {
        fsWatcher.close();
        fsWatcher = null;
        log.info("Config watcher stopped");
      }
    },
  };
}
