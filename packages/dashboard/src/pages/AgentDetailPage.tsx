import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAgent, sendMessage } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { AgentAvatar } from "../office/AgentAvatar";
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
  if (!bootedAt) return "\u2014";
  const diff = Date.now() - new Date(bootedAt).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function eventDotColor(eventType: string): string {
  if (eventType.startsWith("agent:")) return "bg-green-400";
  if (eventType.startsWith("message:")) return "bg-blue-400";
  if (eventType.startsWith("signal:")) return "bg-yellow-400";
  if (eventType.startsWith("delegation:")) return "bg-purple-400";
  return "bg-gray-500";
}

const tierLabels: Record<string, string> = {
  executive: "Executive",
  coordinator: "Coordinator",
  worker: "Worker",
};

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
      <Link to="/agents" className="text-sm text-gray-500 hover:text-gray-300 mb-4 inline-block transition-colors">
        &larr; All Agents
      </Link>

      {/* Hero section */}
      <div className="bg-gradient-to-r from-claw-900/30 via-gray-900 to-gray-900 border border-claw-800/30 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="shrink-0">
            <AgentAvatar status={agent.status} tier={agent.tier} name={agent.name} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold truncate">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="capitalize">{tierLabels[agent.tier] ?? agent.tier}</span>
              <span className="text-gray-600">|</span>
              <span>{agent.team ?? "No team"}</span>
              <span className="text-gray-600">|</span>
              <span className="font-mono text-xs text-gray-500">{agent.id}</span>
            </div>
          </div>
        </div>
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
            <div className="flex justify-between items-center">
              <dt className="flex items-center gap-2 text-gray-500">
                {/* Crown icon */}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Tier
              </dt>
              <dd className="text-gray-200 capitalize">{agent.tier}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="flex items-center gap-2 text-gray-500">
                {/* People icon */}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                Team
              </dt>
              <dd className="text-gray-200">{agent.team ?? "\u2014"}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="flex items-center gap-2 text-gray-500">
                {/* Hash/fingerprint icon */}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.213 8.688M14.137 4.243a7.5 7.5 0 00-11.636 6.257c0 2.92.556 5.709 1.568 8.268M18.258 6.364A7.465 7.465 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268" />
                </svg>
                ID
              </dt>
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
          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {agentEvents.slice(0, 50).map((evt, i) => (
              <div
                key={`${evt.timestamp}-${i}`}
                className="flex items-center gap-3 text-xs py-2.5 px-2 border-b border-gray-800/60 last:border-0 rounded hover:bg-gray-800/30 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${eventDotColor(evt.event)}`} />
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
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">
        Send Message
      </h2>
      <p className="text-xs text-gray-600 mb-4">Send a message directly to this agent</p>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            disabled={sending}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-claw-400 disabled:opacity-50 transition-colors"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 py-2.5 bg-claw-500 hover:bg-claw-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
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
