import React from "react";
import type { AgentStatus, AgentTier } from "../types";

export interface AgentAvatarProps {
  status: AgentStatus;
  tier: AgentTier;
  name: string;
}

const SHIRT_COLORS: Record<AgentTier, string> = {
  executive: "#8B5CF6",
  coordinator: "#3B82F6",
  worker: "#10B981",
};

const SHIRT_HIGHLIGHT: Record<AgentTier, string> = {
  executive: "#A78BFA",
  coordinator: "#60A5FA",
  worker: "#34D399",
};

function getFace(status: AgentStatus) {
  switch (status) {
    case "ready":
      // happy: curved smile, open eyes
      return (
        <>
          {/* Eyes */}
          <circle cx="33" cy="28" r="2" fill="#1e1e1e" />
          <circle cx="47" cy="28" r="2" fill="#1e1e1e" />
          {/* Smile */}
          <path
            d="M34 35 Q40 40 46 35"
            stroke="#1e1e1e"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "busy":
      // focused: determined eyes, straight mouth
      return (
        <>
          {/* Focused eyes — slightly narrowed */}
          <ellipse cx="33" cy="28" rx="2.2" ry="1.5" fill="#1e1e1e" />
          <ellipse cx="47" cy="28" rx="2.2" ry="1.5" fill="#1e1e1e" />
          {/* Determined mouth */}
          <line
            x1="36"
            y1="36"
            x2="44"
            y2="36"
            stroke="#1e1e1e"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );
    case "error":
      // sad: worried eyes, frown
      return (
        <>
          {/* Worried eyes */}
          <circle cx="33" cy="29" r="2" fill="#1e1e1e" />
          <circle cx="47" cy="29" r="2" fill="#1e1e1e" />
          {/* Eyebrows — worried */}
          <line x1="30" y1="24" x2="35" y2="25" stroke="#1e1e1e" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="50" y1="24" x2="45" y2="25" stroke="#1e1e1e" strokeWidth="1.2" strokeLinecap="round" />
          {/* Frown */}
          <path
            d="M34 38 Q40 34 46 38"
            stroke="#1e1e1e"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "booting":
      // neutral: dots for eyes, no mouth
      return (
        <>
          <circle cx="33" cy="28" r="1.5" fill="#94a3b8" />
          <circle cx="47" cy="28" r="1.5" fill="#94a3b8" />
          <line
            x1="37"
            y1="36"
            x2="43"
            y2="36"
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      );
    case "shutdown":
    default:
      return null;
  }
}

function getArms(status: AgentStatus, shirtColor: string) {
  switch (status) {
    case "busy":
      // Both hands on keyboard, animated via CSS class
      return (
        <g className="hands">
          {/* Left arm */}
          <path
            d="M26 62 Q22 72 30 78"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Right arm */}
          <path
            d="M54 62 Q58 72 50 78"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* Hands */}
          <circle cx="30" cy="78" r="3" fill="#FBBF24" />
          <circle cx="50" cy="78" r="3" fill="#FBBF24" />
        </g>
      );
    case "ready":
      // One hand holding coffee
      return (
        <g className="arms-ready">
          {/* Left arm — holding coffee */}
          <path
            d="M26 60 Q18 66 22 74"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="22" cy="74" r="3" fill="#FBBF24" />
          {/* Coffee cup */}
          <g className="coffee-group" style={{ animation: "idle-coffee 5s ease-in-out infinite" }}>
            <rect x="16" y="72" width="10" height="12" rx="2" fill="#8B5E3C" />
            <rect x="14" y="71" width="14" height="3" rx="1.5" fill="#A0724A" />
            {/* Coffee liquid */}
            <rect x="17" y="75" width="8" height="4" rx="1" fill="#5C3A1E" />
            {/* Handle */}
            <path d="M26 75 Q30 78 26 81" stroke="#8B5E3C" strokeWidth="1.5" fill="none" />
          </g>
          {/* Right arm — resting */}
          <path
            d="M54 62 Q60 70 56 78"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="56" cy="78" r="3" fill="#FBBF24" />
        </g>
      );
    case "error":
      // Hands on head
      return (
        <g className="arms-error">
          {/* Left arm to head */}
          <path
            d="M26 58 Q18 48 30 38"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="30" cy="38" r="3" fill="#FBBF24" />
          {/* Right arm to head */}
          <path
            d="M54 58 Q62 48 50 38"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="50" cy="38" r="3" fill="#FBBF24" />
        </g>
      );
    case "booting":
      // Arms at sides
      return (
        <g className="arms-booting" style={{ opacity: 0.6 }}>
          <path
            d="M26 60 L24 78"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M54 60 L56 78"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      );
    case "shutdown":
    default:
      return null;
  }
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  status,
  tier,
  name,
}) => {
  const shirtColor = SHIRT_COLORS[tier];
  const highlight = SHIRT_HIGHLIGHT[tier];

  if (status === "shutdown") {
    // Empty — no avatar, just empty chair shown by parent
    return (
      <svg
        viewBox="0 0 80 100"
        width="80"
        height="100"
        aria-label={`${name} — gone home`}
        style={{ opacity: 0.3 }}
      >
        {/* Empty chair silhouette */}
        <rect x="24" y="50" width="32" height="24" rx="6" fill="#d1d5db" />
        <rect x="28" y="44" width="24" height="8" rx="3" fill="#d1d5db" />
      </svg>
    );
  }

  const avatarClass = `avatar-${status}`;

  return (
    <svg
      viewBox="0 0 80 100"
      width="80"
      height="100"
      className={avatarClass}
      aria-label={`${name} — ${status}`}
      role="img"
    >
      {/* Head */}
      <g className="head-group">
        {/* Hair / top */}
        <ellipse cx="40" cy="18" rx="15" ry="4" fill="#6B4226" />
        {/* Head circle */}
        <circle cx="40" cy="26" r="16" fill="#FCD34D" />
        {/* Cheeks */}
        <circle cx="30" cy="32" r="3" fill="#FBBF24" opacity="0.5" />
        <circle cx="50" cy="32" r="3" fill="#FBBF24" opacity="0.5" />
        {/* Face */}
        {getFace(status)}
      </g>

      {/* Body / torso */}
      <rect x="26" y="44" width="28" height="26" rx="8" fill={shirtColor} />
      {/* Shirt highlight */}
      <rect x="30" y="46" width="10" height="6" rx="3" fill={highlight} opacity="0.4" />

      {/* Arms */}
      {getArms(status, shirtColor)}

      {/* Legs (sitting) */}
      <rect x="30" y="70" width="8" height="14" rx="3" fill="#4B5563" />
      <rect x="42" y="70" width="8" height="14" rx="3" fill="#4B5563" />
      {/* Shoes */}
      <ellipse cx="34" cy="85" rx="5" ry="3" fill="#1F2937" />
      <ellipse cx="46" cy="85" rx="5" ry="3" fill="#1F2937" />
    </svg>
  );
};
