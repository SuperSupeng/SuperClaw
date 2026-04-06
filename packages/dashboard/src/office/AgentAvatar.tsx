import React, { useId } from "react";
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

const SHIRT_SHADOW: Record<AgentTier, string> = {
  executive: "#7C3AED",
  coordinator: "#2563EB",
  worker: "#059669",
};

function getFace(status: AgentStatus) {
  switch (status) {
    case "ready":
      // happy: curved smile, open eyes, subtle eyebrow arches
      return (
        <>
          {/* Eyebrow arches */}
          <path d="M30 24 Q33 22 36 24" stroke="#1e1e1e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M44 24 Q47 22 50 24" stroke="#1e1e1e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="33" cy="28" r="2" fill="#1e1e1e" />
          <circle cx="47" cy="28" r="2" fill="#1e1e1e" />
          {/* Eye highlights */}
          <circle cx="34" cy="27" r="0.6" fill="#fff" />
          <circle cx="48" cy="27" r="0.6" fill="#fff" />
          {/* Wider smile */}
          <path
            d="M33 35 Q40 41 47 35"
            stroke="#1e1e1e"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "busy":
      // focused: determined eyes, straight mouth, sweat drop
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
          {/* Sweat drop */}
          <path d="M52 22 Q53 25 52 27 Q51 25 52 22Z" fill="#93C5FD" opacity="0.7" />
        </>
      );
    case "error":
      // sad: worried eyes, deeper frown, tear drop
      return (
        <>
          {/* Worried eyes */}
          <circle cx="33" cy="29" r="2" fill="#1e1e1e" />
          <circle cx="47" cy="29" r="2" fill="#1e1e1e" />
          {/* Eyebrows — worried */}
          <line x1="30" y1="24" x2="35" y2="25.5" stroke="#1e1e1e" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="50" y1="24" x2="45" y2="25.5" stroke="#1e1e1e" strokeWidth="1.2" strokeLinecap="round" />
          {/* Deeper frown */}
          <path
            d="M33 38 Q40 33 47 38"
            stroke="#1e1e1e"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          {/* Tear drop */}
          <path d="M49 30 Q50 34 49 36 Q48 34 49 30Z" fill="#93C5FD" opacity="0.6" />
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

function getArms(status: AgentStatus, shirtColor: string, skinGrad: string) {
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
          {/* Hands — larger */}
          <circle cx="30" cy="78" r="4" fill={`url(#${skinGrad})`} />
          <circle cx="50" cy="78" r="4" fill={`url(#${skinGrad})`} />
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
          <circle cx="22" cy="74" r="4" fill={`url(#${skinGrad})`} />
          {/* Coffee cup — slightly larger */}
          <g className="coffee-group" style={{ animation: "idle-coffee 5s ease-in-out infinite" }}>
            <rect x="14" y="71" width="13" height="14" rx="2.5" fill="#8B5E3C" />
            <rect x="12" y="69" width="17" height="3.5" rx="1.5" fill="#A0724A" />
            {/* Coffee liquid */}
            <rect x="15" y="74" width="11" height="5" rx="1" fill="#5C3A1E" />
            {/* Handle */}
            <path d="M27 74 Q32 77 27 81" stroke="#8B5E3C" strokeWidth="1.5" fill="none" />
            {/* Steam wisps above cup */}
            <path d="M18 68 Q19 65 18 63" stroke="rgba(180,160,140,0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M22 67 Q23 64 22 62" stroke="rgba(180,160,140,0.35)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          </g>
          {/* Right arm — resting */}
          <path
            d="M54 62 Q60 70 56 78"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="56" cy="78" r="4" fill={`url(#${skinGrad})`} />
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
          <circle cx="30" cy="38" r="4" fill={`url(#${skinGrad})`} />
          {/* Right arm to head */}
          <path
            d="M54 58 Q62 48 50 38"
            stroke={shirtColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="50" cy="38" r="4" fill={`url(#${skinGrad})`} />
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
  const uid = useId();
  const skinGradId = `skin-${uid}`;
  const shirtGradId = `shirt-${uid}`;
  const shirtColor = SHIRT_COLORS[tier];
  const highlight = SHIRT_HIGHLIGHT[tier];
  const shadow = SHIRT_SHADOW[tier];

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
      <defs>
        {/* Skin radial gradient */}
        <radialGradient id={skinGradId} cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#FDD8A5" />
          <stop offset="100%" stopColor="#F5C77E" />
        </radialGradient>
        {/* Shirt linear gradient */}
        <linearGradient id={shirtGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={highlight} />
          <stop offset="100%" stopColor={shadow} />
        </linearGradient>
      </defs>

      {/* Head — slightly smaller r=14 */}
      <g className="head-group">
        {/* Hair / top */}
        <ellipse cx="40" cy="20" rx="13" ry="4" fill="#6B4226" />
        {/* Head circle */}
        <circle cx="40" cy="27" r="14" fill={`url(#${skinGradId})`} />
        {/* Cheeks */}
        <circle cx="31" cy="32" r="2.5" fill="#FBBF24" opacity="0.4" />
        <circle cx="49" cy="32" r="2.5" fill="#FBBF24" opacity="0.4" />
        {/* Face */}
        {getFace(status)}
      </g>

      {/* Body / torso — with gradient */}
      <rect x="26" y="44" width="28" height="26" rx="8" fill={`url(#${shirtGradId})`} />
      {/* Shirt highlight — softer */}
      <rect x="30" y="46" width="10" height="6" rx="3" fill={highlight} opacity="0.3" />

      {/* Arms */}
      {getArms(status, shirtColor, skinGradId)}

      {/* Legs (sitting) — slightly wider */}
      <rect x="29" y="70" width="9" height="14" rx="3" fill="#4B5563" />
      <rect x="42" y="70" width="9" height="14" rx="3" fill="#4B5563" />
      {/* Shoes */}
      <ellipse cx="33.5" cy="85" rx="5.5" ry="3" fill="#1F2937" />
      <ellipse cx="46.5" cy="85" rx="5.5" ry="3" fill="#1F2937" />
    </svg>
  );
};
