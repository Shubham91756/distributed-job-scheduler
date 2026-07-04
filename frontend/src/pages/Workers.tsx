import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Activity, Server } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function Workers() {
  const { data, isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const res = await api.get("/workers");
      return res.data.data.workers;
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm">Loading Workers...</p>
        </div>
      </div>
    );
  }

  const workers = data || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
             <Server className="text-emerald-400" /> 
             Worker Fleet
          </h2>
          <p className="mt-1 text-sm text-slate-400">Monitor active runners, capacity utilization, and heartbeats.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-md overflow-hidden">
        {workers.length === 0 ? (
           <div className="p-12 text-center text-slate-400">
             <Server size={48} className="mx-auto mb-4 opacity-20" />
             <p>No workers are currently registered.</p>
           </div>
        ) : (
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-6 py-4 font-medium">Worker ID / Name</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Health</th>
                <th className="px-6 py-4 font-medium">Capacity</th>
                <th className="px-6 py-4 font-medium">Telemetry</th>
                <th className="px-6 py-4 font-medium">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-100">
              {workers.map((worker: any) => {
                const isOnline = worker.status === 'ONLINE';
                const isStarting = worker.status === 'STARTING';
                const isDraining = worker.status === 'DRAINING';
                const isStopped = worker.status === 'STOPPED';
                const isDead = worker.status === 'DEAD' || worker.status === 'OFFLINE';
                
                // Get latest heartbeat metadata if available
                const hb = worker.heartbeats?.[0]?.metadata;
                const metrics = hb?.metrics || {};
                
                return (
                  <tr key={worker.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium flex flex-col">
                      <span>{worker.name}</span>
                      <span className="text-xs text-slate-500 font-normal">{worker.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide
                        ${isOnline ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 
                          isStarting ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 
                          isDraining ? 'border-orange-400/30 bg-orange-400/10 text-orange-300' : 
                          isDead ? 'border-rose-400/30 bg-rose-400/10 text-rose-300' : 
                          'border-slate-400/30 bg-slate-400/10 text-slate-300'}`}>
                        {isOnline || isStarting ? <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></div> : null}
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide
                        ${worker.healthScore === 'Healthy' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 
                          worker.healthScore === 'Warning' ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 
                          'border-rose-400/30 bg-rose-400/10 text-rose-300'}`}>
                        {worker.healthScore}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="flex-1 bg-slate-800 rounded-full h-2 min-w-[80px] max-w-[120px]">
                            <div className="bg-sky-400 h-2 rounded-full" style={{ width: `${Math.min(100, ((worker.activeJobs || 0) / worker.capacity) * 100)}%` }}></div>
                         </div>
                         <span className="text-sky-300 font-medium text-xs whitespace-nowrap">Running {worker.activeJobs || 0} / {worker.capacity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 flex flex-col gap-1">
                      {metrics.successRate ? (
                         <>
                           <div className="flex justify-between gap-4">
                             <span>Success:</span> <span className="text-emerald-400">{metrics.successRate}</span>
                           </div>
                           <div className="flex justify-between gap-4">
                             <span>Avg Runtime:</span> <span className="text-slate-200">{metrics.averageRuntime}ms</span>
                           </div>
                           <div className="flex justify-between gap-4">
                             <span>Processed:</span> <span className="text-slate-200">{metrics.jobsCompleted + metrics.jobsFailed}</span>
                           </div>
                         </>
                      ) : (
                         <span className="italic opacity-50">No telemetry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {worker.lastHeartbeatAt 
                        ? formatDistanceToNow(new Date(worker.lastHeartbeatAt), { addSuffix: true }) 
                        : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
