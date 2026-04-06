import type { AgentStatus } from "../types";

const statusStyles: Record<AgentStatus, { bg: string; text: string; pulse: boolean }> = {
  booting: { bg: "bg-yellow-500/20", text: "text-yellow-400", pulse: true },
  ready: { bg: "bg-green-500/20", text: "text-green-400", pulse: false },
  busy: { bg: "bg-blue-500/20", text: "text-blue-400", pulse: true },
  error: { bg: "bg-red-500/20", text: "text-red-400", pulse: false },
  shutdown: { bg: "bg-gray-500/20", text: "text-gray-400", pulse: false },
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-current ${style.pulse ? "animate-pulse" : ""}`}
      />
      {status}
    </span>
  );
}
