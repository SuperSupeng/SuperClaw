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

const STATUS_DOT_COLOR: Record<string, string> = {
  booting: "#FBBF24",
  ready: "#22C55E",
  busy: "#3B82F6",
  error: "#EF4444",
  shutdown: "#94A3B8",
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
      {/* Hover tooltip — grid layout with dividers */}
      {hovered && (
        <div className="desk-hover-info">
          <div className="hover-info-row">
            <span className="hover-info-label">Agent</span>
            <span className="hover-info-value">
              <strong>{agent.name}</strong>
            </span>
          </div>
          <div className="hover-info-row">
            <span className="hover-info-label">Tier</span>
            <span className="hover-info-value">{agent.tier}</span>
          </div>
          {agent.team && (
            <div className="hover-info-row">
              <span className="hover-info-label">Team</span>
              <span className="hover-info-value">{agent.team}</span>
            </div>
          )}
          <div className="hover-info-divider" />
          <div className="hover-info-row">
            <span className="hover-info-label">Messages</span>
            <span className="hover-info-value">{agent.messageCount}</span>
          </div>
          {agent.bootedAt && (
            <div className="hover-info-row">
              <span className="hover-info-label">Booted</span>
              <span className="hover-info-value">{formatTime(agent.bootedAt)}</span>
            </div>
          )}
          {agent.lastActiveAt && (
            <div className="hover-info-row">
              <span className="hover-info-label">Last active</span>
              <span className="hover-info-value">{formatTime(agent.lastActiveAt)}</span>
            </div>
          )}
          {agent.error && (
            <>
              <div className="hover-info-divider" />
              <div className="hover-info-row">
                <span className="hover-info-label">Error</span>
                <span className="hover-info-value" style={{ color: "#f87171" }}>
                  {agent.error}
                </span>
              </div>
            </>
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
        <div className="desk-status-text">
          <span
            className="status-dot"
            style={{ backgroundColor: STATUS_DOT_COLOR[agent.status] }}
          />
          {STATUS_LABEL[agent.status]}
        </div>
      </div>
    </div>
  );
};
