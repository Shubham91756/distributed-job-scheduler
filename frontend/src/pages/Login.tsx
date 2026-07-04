import { useState } from "react";
import { api } from "../services/api";

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const credentials = { email: "demo@example.com", password: "password123", name: "Demo User" };
      let res;
      try {
        res = await api.post("/auth/register", credentials);
      } catch (err: any) {
        if (err.response?.status === 400 || err.response?.status === 409) {
          // Likely already exists, fallback to login
          res = await api.post("/auth/login", { email: credentials.email, password: credentials.password });
        } else {
          throw err;
        }
      }
      
      const token = res.data.data.token;
      localStorage.setItem("token", token);
      
      // We also need to ensure there is at least one organization and project
      // so the dashboard and jobs page have data contexts to query.
      try {
          const orgRes = await api.post("/organizations", { name: "Demo Org", slug: "demo-org" });
          const orgId = orgRes.data.data.id;
          await api.post("/projects", { name: "Demo Project", slug: "demo-project", organizationId: orgId });
      } catch (err) {
          // Ignore if they already exist
      }

      window.location.href = "/";
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(72,85,255,0.14),_transparent_32%),linear-gradient(180deg,#0b1020_0%,#111827_100%)] flex items-center justify-center font-sans text-slate-100">
      <div className="w-full max-w-md p-8 space-y-6 rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-md shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500">Codity Scheduler</h1>
          <p className="mt-2 text-slate-400">Sign in to access your dashboard</p>
        </div>
        
        {error && <div className="p-3 text-sm rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}

        <button 
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-medium bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : "Quick Demo Login"}
        </button>
      </div>
    </div>
  );
}
