import React from "react";
import type { AgentInfo } from "../types";
import { Desk } from "./Desk";
import { WaterCooler, PlantPot, Whiteboard } from "./Decoration";
import "./office.css";

export interface VirtualOfficeProps {
  agents: AgentInfo[];
  onAgentClick?: (agentId: string) => void;
}

/** Building icon for the header */
function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <rect x="4" y="8" width="20" height="18" rx="2" fill="#8B7355" />
      <rect x="6" y="10" width="4" height="4" rx="0.5" fill="#FDE68A" />
      <rect x="12" y="10" width="4" height="4" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="10" width="4" height="4" rx="0.5" fill="#FDE68A" />
      <rect x="6" y="16" width="4" height="4" rx="0.5" fill="#FDE68A" />
      <rect x="12" y="16" width="4" height="4" rx="0.5" fill="#FDE68A" />
      <rect x="18" y="16" width="4" height="4" rx="0.5" fill="#FDE68A" />
      <rect x="11" y="22" width="6" height="4" rx="0.5" fill="#92400E" />
      {/* Roof */}
      <path d="M2 8 L14 2 L26 8" stroke="#6B5B4D" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export const VirtualOffice: React.FC<VirtualOfficeProps> = ({
  agents,
  onAgentClick,
}) => {
  const onlineCount = agents.filter(
    (a) => a.status !== "shutdown"
  ).length;

  return (
    <div className="office-floor">
      {/* Header */}
      <header className="office-header">
        <h1 className="office-title">
          <BuildingIcon />
          SuperClaw HQ
        </h1>
        <p className="office-subtitle">
          {onlineCount} of {agents.length} agents online
        </p>
      </header>

      {/* Decorations row */}
      <div className="office-decorations">
        <PlantPot />
        <Whiteboard agentCount={onlineCount} />
        <WaterCooler />
      </div>

      {/* Desk grid */}
      <div className="desk-grid">
        {agents.map((agent) => (
          <Desk
            key={agent.id}
            agent={agent}
            onClick={
              onAgentClick ? () => onAgentClick(agent.id) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};
