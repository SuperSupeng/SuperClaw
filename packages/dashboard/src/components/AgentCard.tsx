import { useNavigate } from "react-router-dom";
import type { AgentInfo } from "../types";
import { StatusBadge } from "./StatusBadge";

const tierColors: Record<string, string> = {
  executive: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  coordinator: "text-claw-400 bg-claw-500/10 border-claw-500/20",
  worker: "text-gray-400 bg-gray-500/10 border-gray-500/20",
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
      className="w-full text-left bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 shadow-md shadow-black/20 hover:bg-gray-800/70 hover:border-gray-600 hover:shadow-lg hover:shadow-black/30 hover:scale-[1.02] transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-100">{agent.name}</h3>
            {agent.team && (
              <span className="inline-block px-2 py-0.5 rounded-full bg-gray-700/50 border border-gray-600/30 text-[10px] text-gray-400 uppercase tracking-wider">
                {agent.team}
              </span>
            )}
          </div>
          <span
            className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border text-xs font-medium ${tierColors[agent.tier] ?? ""}`}
          >
            {agent.tier}
          </span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <span className="block text-gray-500 text-xs mb-0.5">Messages</span>
          <span className="text-gray-200 font-medium text-sm">{agent.messageCount}</span>
        </div>
        <div>
          <span className="block text-gray-500 text-xs mb-0.5">Last Active</span>
          <span className="text-gray-200 font-medium text-sm">{timeAgo(agent.lastActiveAt)}</span>
        </div>
      </div>
    </button>
  );
}
