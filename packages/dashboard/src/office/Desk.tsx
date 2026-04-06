import React, { useState } from "react";
import type { AgentInfo } from "../types";
import { AgentAvatar } from "./AgentAvatar";
import { StatusEffect } from "./StatusEffect";

export interface DeskProps {
  agent: AgentInfo;
  onClick?: () => void;
}

const TIER_ICON: Record<string, string> = {
  executive: "👑",
  coordinator: "🎯",
  worker: "⚙️",
};

const STATUS_LABEL: Record<string, string> = {
  booting: "Starting up…",
  ready: "Idle",
  busy: "Working",
  error: "Error",
  shutdown: "Offline",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export const Desk: React.FC<DeskProps> = ({ agent, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const isShutdown = agent.status === "shutdown";

  return (
    <div
      className="desk-container"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`${agent.name} — ${agent.status}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Hover tooltip */}
      {hovered && (
        <div className="desk-hover-info">
          <div>
            <strong>{agent.name}</strong> ({agent.tier})
          </div>
          {agent.team && <div>Team: {agent.team}</div>}
          <div>Messages: {agent.messageCount}</div>
          {agent.bootedAt && <div>Booted: {formatTime(agent.bootedAt)}</div>}
          {agent.lastActiveAt && (
            <div>Last active: {formatTime(agent.lastActiveAt)}</div>
          )}
          {agent.error && (
            <div style={{ color: "#fca5a5" }}>Error: {agent.error}</div>
          )}
        </div>
      )}

      {/* Avatar + Effects */}
      <div className="avatar-wrapper">
        <AgentAvatar
          status={agent.status}
          tier={agent.tier}
          name={agent.name}
        />
        <StatusEffect status={agent.status} />
      </div>

      {/* Desk surface with monitor */}
      <div className="desk-surface">
        <div className="desk-monitor">
          <div
            className={`desk-monitor-screen ${agent.status}`}
          />
        </div>
      </div>

      {/* Chair */}
      <div className={`desk-chair ${isShutdown ? "pushed-back" : ""}`} />

      {/* Nameplate */}
      <div className="desk-nameplate">
        <div className="desk-name">
          <span className="desk-tier">{TIER_ICON[agent.tier]}</span>
          {agent.name}
        </div>
        <div className="desk-status-text">{STATUS_LABEL[agent.status]}</div>
      </div>
    </div>
  );
};
