export type AgentTier = "executive" | "coordinator" | "worker";
export type AgentStatus = "booting" | "ready" | "busy" | "error" | "shutdown";

export interface AgentInfo {
  id: string;
  name: string;
  tier: AgentTier;
  status: AgentStatus;
  team?: string;
  bootedAt: string | null;
  messageCount: number;
  lastActiveAt: string | null;
  error?: string;
}

export interface SignalInfo {
  id: string;
  type: string;
  from: string;
  to: string[];
  priority: "critical" | "high" | "normal" | "low";
  status: "pending" | "delivered" | "consumed" | "expired" | "failed";
  createdAt: string;
  payload?: unknown;
}

export interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}
