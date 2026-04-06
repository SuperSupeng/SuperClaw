import React from "react";
import type { AgentStatus } from "../types";

export interface StatusEffectProps {
  status: AgentStatus;
}

/** Floating code symbols for busy agents */
function BusyEffect() {
  const symbols = ["{", "0", "1", "}"];
  return (
    <>
      {symbols.map((s, i) => (
        <span key={i} className="effect-particle">
          {s}
        </span>
      ))}
    </>
  );
}

/** Error exclamation bubble + red glow */
function ErrorEffect() {
  return (
    <>
      <div className="error-glow" />
      <div className="error-bubble">!</div>
    </>
  );
}

/** Booting gear + loading dots */
function BootingEffect() {
  return (
    <>
      <div className="booting-gear">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <div className="booting-dots">
        <div className="booting-dot" />
        <div className="booting-dot" />
        <div className="booting-dot" />
      </div>
    </>
  );
}

/** Coffee steam wisps for ready/idle agents */
function ReadyEffect() {
  return (
    <div className="coffee-steam">
      <div className="steam-wisp" />
      <div className="steam-wisp" />
      <div className="steam-wisp" />
    </div>
  );
}

/** Shutdown — zzz + gone sign */
function ShutdownEffect() {
  return (
    <>
      <div className="zzz-container">
        <span className="zzz-letter">z</span>
        <span className="zzz-letter">z</span>
        <span className="zzz-letter">z</span>
      </div>
      <div className="shutdown-sign">Gone home 🏠</div>
    </>
  );
}

export const StatusEffect: React.FC<StatusEffectProps> = ({ status }) => {
  return (
    <div className="status-effect">
      {status === "busy" && <BusyEffect />}
      {status === "error" && <ErrorEffect />}
      {status === "booting" && <BootingEffect />}
      {status === "ready" && <ReadyEffect />}
      {status === "shutdown" && <ShutdownEffect />}
    </div>
  );
};
