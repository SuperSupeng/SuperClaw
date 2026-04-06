import { useNavigate } from "react-router-dom";
import { VirtualOffice } from "../office/VirtualOffice";
import type { AgentInfo } from "../types";

interface OfficePageProps {
  agents: AgentInfo[];
  loading: boolean;
  error: string | null;
}

export function OfficePage({ agents, loading, error }: OfficePageProps) {
  const navigate = useNavigate();

  // Loading state (first load)
  if (loading && agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-claw-400" />
        <p className="text-sm text-gray-500">Loading your office...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-gray-900 border border-red-800/50 rounded-xl p-6 max-w-sm text-center">
          <p className="text-red-400 font-medium mb-2">Failed to load office</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No agents configured yet</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <VirtualOffice
        agents={agents}
        onAgentClick={(id) => navigate(`/agents/${id}`)}
      />
    </div>
  );
}
