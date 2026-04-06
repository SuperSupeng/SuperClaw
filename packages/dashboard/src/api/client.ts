import type { AgentInfo, SignalInfo } from "../types";

async function request<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAgents(): Promise<AgentInfo[]> {
  const data = await request<{ agents: AgentInfo[] }>("/api/agents");
  return data.agents;
}

export async function fetchAgent(id: string): Promise<AgentInfo> {
  const data = await request<{
    config: { id: string; name: string; tier: string; team?: string; [k: string]: unknown };
    instance: { status: string; bootedAt: string | null; messageCount: number; lastActiveAt: string | null; error?: string };
  }>(`/api/agents/${id}`);
  return {
    id: data.config.id,
    name: data.config.name,
    tier: data.config.tier as AgentInfo["tier"],
    team: data.config.team,
    status: data.instance.status as AgentInfo["status"],
    bootedAt: data.instance.bootedAt,
    messageCount: data.instance.messageCount,
    lastActiveAt: data.instance.lastActiveAt,
    error: data.instance.error,
  };
}

export async function sendMessage(agentId: string, content: string): Promise<void> {
  const body = {
    id: crypto.randomUUID(),
    channelType: "webhook",
    accountId: "dashboard",
    sourceType: "webhook",
    senderId: "dashboard-user",
    senderName: "Dashboard",
    content,
    timestamp: new Date().toISOString(),
    metadata: {},
  };
  const res = await fetch(`/api/agents/${agentId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Send failed: ${res.status} ${res.statusText}`);
  }
}

export async function fetchSignals(): Promise<SignalInfo[]> {
  const data = await request<{ signals: SignalInfo[] }>("/api/signals");
  return data.signals;
}

export async function fetchConfig(): Promise<unknown> {
  const data = await request<{ config: unknown }>("/api/config");
  return data.config;
}

export interface HealthInfo {
  status: string;
  uptime: number;
  agentCount: number;
}

export function fetchHealth(): Promise<HealthInfo> {
  return request<HealthInfo>("/health");
}
