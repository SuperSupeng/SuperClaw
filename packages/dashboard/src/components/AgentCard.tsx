import { useNavigate } from "react-router-dom";
import type { AgentInfo } from "../types";
import { StatusBadge } from "./StatusBadge";

const tierColors: Record<string, string> = {
  executive: "text-purple-400 bg-purple-500/10",
  coordinator: "text-claw-400 bg-claw-500/10",
  worker: "text-gray-400 bg-gray-500/10",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AgentCard({ agent }: { agent: AgentInfo }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/agents/${agent.id}`)}
      className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-100">{agent.name}</h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${tierColors[agent.tier] ?? ""}`}
          >
            {agent.tier}
          </span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{agent.messageCount} messages</span>
        <span>Active {timeAgo(agent.lastActiveAt)}</span>
      </div>

      {agent.team && (
        <div className="mt-2 text-xs text-gray-600">
          Team: <span className="text-gray-400">{agent.team}</span>
        </div>
      )}
    </button>
  );
}
