import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchSignals } from "../api/client";
import type { SignalInfo } from "../types";

const PAGE_SIZE = 20;

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
    high: "bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30",
    normal: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
    low: "bg-gray-500/15 text-gray-400 ring-1 ring-gray-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[priority] ?? "bg-gray-500/15 text-gray-400"}`}>
      {priority}
    </span>
  );
}

function SignalStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30",
    delivered: "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30",
    consumed: "bg-green-500/15 text-green-400 ring-1 ring-green-500/30",
    expired: "bg-gray-500/15 text-gray-500 ring-1 ring-gray-500/30",
    failed: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-500/15 text-gray-400"}`}>
      {status}
    </span>
  );
}

export function SignalFlowPage() {
  const [signals, setSignals] = useState<SignalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const data = await fetchSignals();
      setSignals(data);
      setPage(1); // reset to page 1 on refresh
    } catch {
      // silently retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(signals.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedSignals = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return signals.slice(start, start + PAGE_SIZE);
  }, [signals, currentPage]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Signal Flow
        <span className="ml-2 text-base font-normal text-gray-500">({signals.length})</span>
      </h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : signals.length === 0 ? (
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
              d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-300 mb-1">No signals recorded</h3>
          <p className="text-sm text-gray-500">Signals will appear here as agents communicate.</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/60 border-b-2 border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">From &rarr; To</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Priority</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSignals.map((signal) => (
                    <tr
                      key={signal.id}
                      className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-200">{signal.type}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="text-gray-300">{signal.from}</span>
                        <span className="text-gray-600 mx-1.5">&rarr;</span>
                        <span className="text-gray-300">{signal.to.join(", ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={signal.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <SignalStatusBadge status={signal.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(signal.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
