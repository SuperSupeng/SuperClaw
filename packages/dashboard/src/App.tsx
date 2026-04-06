import { useState, useCallback } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAgents } from "./hooks/useAgents";
import { useWebSocket } from "./hooks/useWebSocket";
import { AgentListPage } from "./pages/AgentListPage";
import { AgentDetailPage } from "./pages/AgentDetailPage";
import { SignalFlowPage } from "./pages/SignalFlowPage";
import { ConfigPage } from "./pages/ConfigPage";
import { OfficePage } from "./pages/OfficePage";

const navItems = [
  { to: "/office", label: "Virtual Office", icon: "🏢" },
  { to: "/agents", label: "Agents", icon: "🤖" },
  { to: "/signals", label: "Signals", icon: "⚡" },
  { to: "/config", label: "Config", icon: "⚙️" },
];

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h5M20 20v-5h-5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.49 9A9 9 0 0 0 5.64 5.64L4 9m16-4v5M3.51 15A9 9 0 0 0 18.36 18.36L20 15"
      />
    </svg>
  );
}

export function App() {
  const { agents, loading, error, updateFromEvent, refresh } = useAgents();
  const { connected, events } = useWebSocket({ onEvent: updateFromEvent });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 800);
  }, [refresh]);

  return (
    <div className="flex h-screen">
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800/80
          flex flex-col shadow-xl shadow-black/20
          transform transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-5 border-b border-gray-800/80">
          <h1 className="text-lg font-bold text-gray-100">
            <span className="text-claw-400 drop-shadow-[0_0_8px_rgba(54,170,247,0.3)]">
              Super
            </span>
            Claw
          </h1>
          <p className="text-[11px] text-gray-500 mt-1 tracking-wide">
            Agent Dashboard
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "border-l-2 border-claw-400 bg-claw-950/40 text-claw-300 font-medium"
                    : "border-l-2 border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-gray-800/80">
          <span className="text-[10px] text-gray-600 tracking-wider uppercase">
            v0.1.1
          </span>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className={`h-12 shrink-0 flex items-center justify-between px-4 md:px-5 border-b border-gray-800/80 bg-gray-900/60 backdrop-blur-sm ${
            !connected ? "shadow-[inset_0_-1px_0_0_rgba(239,68,68,0.3)]" : ""
          }`}
        >
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Open sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Spacer on desktop (no hamburger) */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${
                  connected
                    ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]"
                    : "bg-red-400 animate-pulse shadow-[0_0_6px_rgba(248,113,113,0.4)]"
                }`}
              />
              <span className="hidden sm:inline">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="ml-1 p-1.5 rounded-md hover:bg-gray-800 transition-all duration-200 text-gray-400 hover:text-gray-200"
              title="Refresh agents"
            >
              <RefreshIcon spinning={refreshing} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/office" replace />} />
            <Route
              path="/office"
              element={
                <OfficePage agents={agents} loading={loading} error={error} />
              }
            />
            <Route
              path="/agents"
              element={
                <AgentListPage agents={agents} loading={loading} error={error} />
              }
            />
            <Route
              path="/agents/:id"
              element={<AgentDetailPage events={events} />}
            />
            <Route path="/signals" element={<SignalFlowPage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
