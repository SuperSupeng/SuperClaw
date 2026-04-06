import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAgent, sendMessage } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import type { AgentInfo, WSEvent } from "../types";

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

function formatUptime(bootedAt: string | null): string {
  if (!bootedAt) return "—";
  const diff = Date.now() - new Date(bootedAt).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function AgentDetailPage({ events }: { events: WSEvent[] }) {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchAgent(id)
      .then(setAgent)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load agent"));
  }, [id]);

  const agentEvents = events.filter(
    (e) => e.data.agentId === id || e.data.from === id || e.data.to === id,
  );

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/agents" className="text-claw-400 hover:underline">
          Back to agents
        </Link>
      </div>
    );
  }

  if (!agent) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <Link to="/agents" className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block">
        ← All Agents
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">{agent.name}</h1>
        <StatusBadge status={agent.status} />
      </div>

      {agent.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400 text-sm">
          {agent.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Config */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Configuration
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Tier</dt>
              <dd className="text-gray-200 capitalize">{agent.tier}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Team</dt>
              <dd className="text-gray-200">{agent.team ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">ID</dt>
              <dd className="text-gray-200 font-mono text-xs">{agent.id}</dd>
            </div>
          </dl>
        </div>

        {/* Stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Stats
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Messages</dt>
              <dd className="text-gray-200">{agent.messageCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Uptime</dt>
              <dd className="text-gray-200">{formatUptime(agent.bootedAt)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Active</dt>
              <dd className="text-gray-200">{timeAgo(agent.lastActiveAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recent Events
        </h2>
        {agentEvents.length === 0 ? (
          <p className="text-gray-600 text-sm">No events yet.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {agentEvents.slice(0, 50).map((evt, i) => (
              <div
                key={`${evt.timestamp}-${i}`}
                className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-800 last:border-0"
              >
                <span className="text-gray-600 font-mono shrink-0">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-claw-400 font-medium">{evt.event}</span>
                <span className="text-gray-500 truncate">
                  {JSON.stringify(evt.data).slice(0, 100)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Message */}
      <MessagePanel agentId={agent.id} />
    </div>
  );
}

function MessagePanel({ agentId }: { agentId: string }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (type: "success" | "error", text: string) => {
    clearTimeout(toastTimer.current);
    setToast({ type, text });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      await sendMessage(agentId, content);
      setInput("");
      showToast("success", "Message sent");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Send Message
      </h2>
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-claw-400 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-claw-500 hover:bg-claw-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
      {toast && (
        <p
          className={`mt-3 text-xs ${toast.type === "success" ? "text-green-400" : "text-red-400"}`}
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
