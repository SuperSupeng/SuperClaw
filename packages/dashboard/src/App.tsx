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

export function App() {
  const { agents, loading, error, updateFromEvent, refresh } = useAgents();
  const { connected, events } = useWebSocket({ onEvent: updateFromEvent });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen">
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 border-r border-gray-800 flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:static md:translate-x-0 md:shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-lg font-bold text-gray-100">
            <span className="text-claw-400">Super</span>Claw
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Agent Dashboard</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
          v0.1.1
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 md:px-5 border-b border-gray-800 bg-gray-900/50">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Spacer on desktop (no hamburger) */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-green-400" : "bg-red-400"}`}
            />
            <span className="hidden sm:inline">
              {connected ? "Connected" : "Disconnected"}
            </span>
            <button
              onClick={refresh}
              className="ml-2 p-1 rounded hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
              title="Refresh agents"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/office" replace />} />
            <Route path="/office" element={<OfficePage agents={agents} loading={loading} error={error} />} />
            <Route path="/agents" element={<AgentListPage agents={agents} loading={loading} error={error} />} />
            <Route path="/agents/:id" element={<AgentDetailPage events={events} />} />
            <Route path="/signals" element={<SignalFlowPage />} />
            <Route path="/config" element={<ConfigPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
