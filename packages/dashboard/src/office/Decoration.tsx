import React from "react";

/** A cute water cooler SVG */
export const WaterCooler: React.FC = () => (
  <div className="decoration-item" aria-label="Water cooler">
    <svg width="40" height="64" viewBox="0 0 40 64" fill="none">
      <defs>
        <linearGradient id="water-jug-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Water jug — gradient fill */}
      <rect x="12" y="2" width="16" height="22" rx="4" fill="url(#water-jug-grad)" opacity="0.8" />
      <rect x="14" y="6" width="12" height="14" rx="2" fill="#BFDBFE" opacity="0.4" />
      {/* Body */}
      <rect x="8" y="24" width="24" height="28" rx="3" fill="#E5E7EB" />
      <rect x="10" y="26" width="20" height="10" rx="2" fill="#F3F4F6" />
      {/* Tap */}
      <rect x="28" y="32" width="6" height="3" rx="1" fill="#9CA3AF" />
      <circle cx="33" cy="33" r="1.5" fill="#6B7280" />
      {/* Legs */}
      <rect x="10" y="52" width="4" height="10" rx="1" fill="#9CA3AF" />
      <rect x="26" y="52" width="4" height="10" rx="1" fill="#9CA3AF" />
      {/* Water bubbles — more visible */}
      <circle cx="17" cy="9" r="1.5" fill="#fff" opacity="0.7" className="water-bubble-anim" />
      <circle cx="22" cy="13" r="1.2" fill="#fff" opacity="0.6" className="water-bubble-anim" style={{ animationDelay: "1s" }} />
      <circle cx="19" cy="16" r="0.9" fill="#fff" opacity="0.5" className="water-bubble-anim" style={{ animationDelay: "2s" }} />
    </svg>
  </div>
);

/** A cute potted plant SVG — with sway animation */
export const PlantPot: React.FC = () => (
  <div className="decoration-item" aria-label="Office plant">
    <svg width="36" height="56" viewBox="0 0 36 56" fill="none">
      <defs>
        <linearGradient id="pot-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="leaf-dark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      {/* Pot */}
      <path d="M8 34 L6 52 Q6 54 8 54 L28 54 Q30 54 30 52 L28 34 Z" fill="url(#pot-grad)" />
      <rect x="6" y="32" width="24" height="4" rx="2" fill="#B45309" />
      {/* Soil */}
      <ellipse cx="18" cy="35" rx="10" ry="2" fill="#78350F" />
      {/* Stems and leaves — in a sway group */}
      <g className="plant-sway">
        <path d="M18 34 L18 18" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
        <path d="M18 24 Q10 18 12 10" stroke="#16A34A" strokeWidth="1.5" fill="none" />
        <ellipse cx="11" cy="10" rx="5" ry="8" fill="url(#leaf-dark-grad)" transform="rotate(-20 11 10)" />
        <path d="M18 20 Q26 14 24 6" stroke="#16A34A" strokeWidth="1.5" fill="none" />
        <ellipse cx="25" cy="6" rx="5" ry="7" fill="#16A34A" transform="rotate(15 25 6)" />
        <path d="M18 28 Q8 26 6 20" stroke="#16A34A" strokeWidth="1.5" fill="none" />
        <ellipse cx="5" cy="20" rx="4" ry="6" fill="#4ADE80" transform="rotate(-30 5 20)" />
      </g>
    </svg>
  </div>
);

interface WhiteboardProps {
  agentCount?: number;
  text?: string;
}

/** A whiteboard that shows sprint or agent info */
export const Whiteboard: React.FC<WhiteboardProps> = ({
  agentCount = 0,
  text = "Sprint 42",
}) => (
  <div className="decoration-item" aria-label="Office whiteboard">
    <svg width="80" height="56" viewBox="0 0 80 56" fill="none">
      {/* Shadow beneath board */}
      <rect x="6" y="48" width="68" height="4" rx="2" fill="rgba(0,0,0,0.06)" />
      {/* Board frame */}
      <rect x="4" y="4" width="72" height="44" rx="2" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
      {/* Top rail */}
      <rect x="2" y="2" width="76" height="6" rx="2" fill="#94A3B8" />
      {/* Text on board — larger, more readable */}
      <text x="40" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill="#334155">
        {text}
      </text>
      <text x="40" y="37" textAnchor="middle" fontSize="7" fill="#64748B">
        {agentCount} agents online
      </text>
      {/* Marker tray */}
      <rect x="20" y="48" width="40" height="4" rx="1" fill="#CBD5E1" />
      {/* Markers */}
      <rect x="28" y="47" width="3" height="5" rx="1" fill="#EF4444" />
      <rect x="34" y="47" width="3" height="5" rx="1" fill="#3B82F6" />
      <rect x="40" y="47" width="3" height="5" rx="1" fill="#22C55E" />
    </svg>
  </div>
);
