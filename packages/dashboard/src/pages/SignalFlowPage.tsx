import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchSignals } from "../api/client";
import type { SignalInfo } from "../types";

const PAGE_SIZE = 20;

const priorityColors: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  normal: "text-blue-400",
  low: "text-gray-400",
};

const statusColors: Record<string, string> = {
  pending: "text-yellow-400",
  delivered: "text-blue-400",
  consumed: "text-green-400",
  expired: "text-gray-500",
  failed: "text-red-400",
};

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
        <div className="text-center py-12 text-gray-500">No signals recorded.</div>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">From → To</th>
                    <th className="text-left px-4 py-3 font-medium">Priority</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSignals.map((signal) => (
                    <tr
                      key={signal.id}
                      className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-200">{signal.type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {signal.from}
                        <span className="text-gray-600 mx-1">→</span>
                        {signal.to.join(", ")}
                      </td>
                      <td className={`px-4 py-3 ${priorityColors[signal.priority] ?? ""}`}>
                        {signal.priority}
                      </td>
                      <td className={`px-4 py-3 ${statusColors[signal.status] ?? ""}`}>
                        {signal.status}
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
