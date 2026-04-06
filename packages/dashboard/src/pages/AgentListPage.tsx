import { useMemo, useState } from "react";
import { AgentCard } from "../components/AgentCard";
import type { AgentInfo, AgentStatus } from "../types";

type Filter = "all" | AgentStatus;
type SortKey = "name" | "status" | "messages" | "lastActive";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ready", label: "Ready" },
  { value: "busy", label: "Busy" },
  { value: "error", label: "Error" },
];

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
  { value: "messages", label: "Messages" },
  { value: "lastActive", label: "Last Active" },
];

interface AgentListPageProps {
  agents: AgentInfo[];
  loading: boolean;
  error: string | null;
}

function sortAgents(agents: AgentInfo[], key: SortKey): AgentInfo[] {
  return [...agents].sort((a, b) => {
    switch (key) {
      case "name":
        return a.name.localeCompare(b.name);
      case "status":
        return a.status.localeCompare(b.status);
      case "messages":
        return b.messageCount - a.messageCount;
      case "lastActive": {
        const ta = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const tb = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return tb - ta;
      }
    }
  });
}

export function AgentListPage({ agents, loading, error }: AgentListPageProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    let result = agents;

    // search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }

    // status filter
    if (filter !== "all") {
      result = result.filter((a) => a.status === filter);
    }

    // sort
    return sortAgents(result, sortKey);
  }, [agents, search, filter, sortKey]);

  const hasSearch = search.trim().length > 0;
  const hasFilter = filter !== "all";

  // First load spinner
  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-claw-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-2">Failed to load agents</p>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            Agents
            <span className="ml-2 text-base font-normal text-gray-500">({agents.length})</span>
          </h1>

          {/* Search input */}
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600 w-48"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-gray-600"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>

          {/* Status filter buttons */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filter === f.value
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          {hasSearch
            ? `No agents matching "${search.trim()}"`
            : hasFilter
              ? "No agents match this filter."
              : "No agents found."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
