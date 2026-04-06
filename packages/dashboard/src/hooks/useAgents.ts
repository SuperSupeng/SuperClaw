import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAgents } from "../api/client";
import type { AgentInfo, WSEvent } from "../types";

const POLL_INTERVAL = 3000;

export function useAgents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const updateFromEvent = useCallback((event: WSEvent) => {
    const agentId = event.data.agentId ?? event.data.from ?? event.data.to;
    if (!agentId) return;

    const patchAgent = (patch: Partial<AgentInfo>) => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, ...patch, lastActiveAt: event.timestamp }
            : a,
        ),
      );
    };

    switch (event.event) {
      case "agent:status":
        patchAgent({
          status: (event.data.status as AgentInfo["status"]) ?? undefined,
        });
        break;
      case "agent:ready":
        patchAgent({ status: "ready", error: undefined });
        break;
      case "agent:error":
        patchAgent({
          status: "error",
          error: (event.data.error as string) ?? "Unknown error",
        });
        break;
      case "message:processing":
        patchAgent({ status: "busy" });
        break;
      case "message:responded":
        patchAgent({ status: "ready" });
        break;
    }
  }, []);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { agents, loading, error, updateFromEvent, refresh };
}
