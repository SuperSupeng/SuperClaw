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

function AgentCardSkeleton() {
  return (
    <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="h-5 w-32 bg-gray-700 rounded mb-2" />
          <div className="h-4 w-16 bg-gray-700 rounded-full" />
        </div>
        <div className="h-5 w-16 bg-gray-700 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          <div className="h-3 w-14 bg-gray-700/50 rounded mb-1" />
          <div className="h-4 w-10 bg-gray-700/50 rounded" />
        </div>
        <div>
          <div className="h-3 w-16 bg-gray-700/50 rounded mb-1" />
          <div className="h-4 w-12 bg-gray-700/50 rounded" />
        </div>
      </div>
    </div>
  );
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

  // First load skeleton
  if (loading && agents.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Agents</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
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

          {/* Search input with icon */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-8 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-600 w-48 transition-colors"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-transparent border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-gray-200 font-medium focus:outline-none focus:border-gray-600 transition-colors cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-900">
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
        <div className="flex flex-col items-center justify-center py-20">
          <svg
            className="w-16 h-16 text-gray-700 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-300 mb-1">No agents found</h3>
          <p className="text-sm text-gray-500">
            {hasSearch
              ? `No agents matching "${search.trim()}"`
              : hasFilter
                ? `No agents with status "${filter}". Try a different filter.`
                : "No agents are configured yet. Add agents in the configuration to get started."}
          </p>
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
