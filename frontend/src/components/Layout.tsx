import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ListTree, Activity, Settings, LogOut, CheckCircle, FolderKanban, Archive, Calendar, Layers, ListChecks, Clock, ServerCog, Settings2, ArchiveX } from "lucide-react";
import { useProjectContext } from "../context/ProjectContext";

export function Layout() {
  const location = useLocation();
  const { projects, activeProjectId, setActiveProjectId, isLoading } = useProjectContext();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Projects", path: "/projects", icon: FolderKanban },
    { name: "Queues", path: "/queues", icon: ListTree },
    { name: "Jobs", path: "/jobs", icon: ListChecks },
    { name: "Batches", path: "/batches", icon: Layers },
    { name: "Schedules", path: "/schedules", icon: Clock },
    { name: "Activity", path: "/activity", icon: Activity },
    { name: "Workers", path: "/workers", icon: ServerCog },
    { name: "Retry Policies", path: "/retry-policies", icon: Settings2 },
    { name: "Dead Letters", path: "/dlq", icon: ArchiveX },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(72,85,255,0.14),_transparent_32%),linear-gradient(180deg,#0b1020_0%,#111827_100%)] text-slate-100 font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-slate-950/50 backdrop-blur-md flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">
            Codity Scheduler
          </span>
        </div>

        {/* Project Selector */}
        <div className="px-4 py-4 border-b border-white/10">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block px-2">
            Active Project
          </label>
          <div className="relative">
            <select
              value={activeProjectId || ""}
              onChange={(e) => setActiveProjectId(e.target.value || null)}
              disabled={isLoading || projects.length === 0}
              className="w-full appearance-none bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 cursor-pointer"
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-sky-500/10 text-sky-400 font-medium"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon size={20} className={isActive ? "text-sky-400" : "text-slate-500"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-200"
          >
            <LogOut size={20} className="text-slate-500" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-white/10 bg-slate-950/50 backdrop-blur-md flex items-center justify-between px-6 md:hidden">
          <span className="text-lg font-bold text-white">Codity</span>
          
          <div className="relative max-w-[150px]">
            <select
              value={activeProjectId || ""}
              onChange={(e) => setActiveProjectId(e.target.value || null)}
              disabled={isLoading || projects.length === 0}
              className="w-full appearance-none bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50"
            >
              {projects.length === 0 ? (
                <option value="">No projects</option>
              ) : (
                projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </header>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
