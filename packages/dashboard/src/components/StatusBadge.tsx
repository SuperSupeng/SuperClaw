import type { AgentStatus } from "../types";

const statusStyles: Record<
  AgentStatus,
  { bg: string; text: string; label: string }
> = {
  booting: {
    bg: "bg-warning-500/15",
    text: "text-warning-400",
    label: "Starting up",
  },
  ready: {
    bg: "bg-success-500/15",
    text: "text-success-400",
    label: "Operational",
  },
  busy: {
    bg: "bg-claw-500/15",
    text: "text-claw-400",
    label: "Processing",
  },
  error: {
    bg: "bg-error-500/15",
    text: "text-error-400",
    label: "Error occurred",
  },
  shutdown: {
    bg: "bg-gray-500/15",
    text: "text-gray-400",
    label: "Powered off",
  },
};

function StatusIcon({ status }: { status: AgentStatus }) {
  const cls = "w-3.5 h-3.5 shrink-0";

  switch (status) {
    case "booting":
      return (
        <svg
          className={`${cls} animate-spin`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      );
    case "ready":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      );
    case "busy":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
          />
        </svg>
      );
    case "error":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"
          />
        </svg>
      );
    case "shutdown":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.36 6.64a9 9 0 11-12.73 0M12 2v10"
          />
        </svg>
      );
  }
}

export function StatusBadge({ status }: { status: AgentStatus }) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors duration-200 ${style.bg} ${style.text}`}
      title={style.label}
    >
      <StatusIcon status={status} />
      {status}
    </span>
  );
}
