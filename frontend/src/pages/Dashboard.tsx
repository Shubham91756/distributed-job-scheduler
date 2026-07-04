import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Activity, Clock, CheckCircle, XCircle, Archive, AlertTriangle, BarChart2, RefreshCw, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/stats/dashboard");
      return res.data.data;
    },
  });

  const { data: metricsData } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const res = await api.get("/stats/metrics/time-series", { params: { timeRange: "1h" }});
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const res = await api.get("/alerts", { params: { active: true }});
      return res.data.data.alerts;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const stats = data ? {
    queuedJobs: data.overview.queuedJobs,
    runningJobs: data.overview.runningJobs,
    completedJobs: data.overview.completedJobs,
    failedJobs: data.overview.failedJobs,
    onlineWorkers: data.workers.online,
    successRate: data.overview.successRate, // Already a string with '%' from backend
    retryingJobs: data.retries?.retryingJobs || 0,
    retriesToday: data.retries?.retriesToday || 0,
    retrySuccessRate: data.retries?.retrySuccessRate || "0.0%",
    averageRetryCount: data.retries?.averageRetryCount || 0,
    dlqTotal: data.dlq?.totalActive || 0,
    dlqRecovered: data.dlq?.recovered || 0,
    dlqPermanentFailures: data.dlq?.permanentFailures || 0,
    activeSchedules: data.schedules?.activeSchedules || 0,
    upcomingJobs: data.schedules?.upcomingJobs || 0,
    jobsGeneratedToday: data.schedules?.jobsGeneratedToday || 0,
  } : {
    queuedJobs: 0,
    runningJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    onlineWorkers: 0,
    successRate: "0%",
    retryingJobs: 0,
    retriesToday: 0,
    retrySuccessRate: "0.0%",
    averageRetryCount: 0,
    dlqTotal: 0,
    dlqRecovered: 0,
    dlqPermanentFailures: 0,
    activeSchedules: 0,
    upcomingJobs: 0,
    jobsGeneratedToday: 0,
  };

  const statCards = [
    { label: "Queued Jobs", value: stats.queuedJobs, icon: Clock, color: "text-amber-400" },
    { label: "Running Jobs", value: stats.runningJobs, icon: Activity, color: "text-sky-400" },
    { label: "Completed Jobs", value: stats.completedJobs, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Failed Jobs", value: stats.failedJobs, icon: XCircle, color: "text-rose-400" },
    { label: "Workers Online", value: stats.onlineWorkers, icon: Activity, color: "text-indigo-400" },
    { label: "Success Rate", value: stats.successRate, icon: CheckCircle, color: "text-teal-400" },
    { label: "Retrying Jobs", value: stats.retryingJobs, icon: Clock, color: "text-fuchsia-400" },
    { label: "Retries Today", value: stats.retriesToday, icon: Activity, color: "text-fuchsia-300" },
    { label: "Retry Success Rate", value: stats.retrySuccessRate, icon: CheckCircle, color: "text-teal-300" },
    { label: "Avg Retry Count", value: Number(stats.averageRetryCount).toFixed(1), icon: Activity, color: "text-slate-400" },
    { label: "Total DLQ", value: stats.dlqTotal, icon: Archive, color: "text-rose-500" },
    { label: "DLQ Recovered", value: stats.dlqRecovered, icon: RefreshCw, color: "text-emerald-500" },
    { label: "Perm. Failures", value: stats.dlqPermanentFailures, icon: AlertTriangle, color: "text-red-500" },
    { label: "Active Schedules", value: stats.activeSchedules, icon: Calendar, color: "text-purple-400" },
    { label: "Upcoming Jobs", value: stats.upcomingJobs, icon: Clock, color: "text-purple-300" },
    { label: "Jobs Generated Today", value: stats.jobsGeneratedToday, icon: Activity, color: "text-indigo-300" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Overview</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
              Platform Health
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Real-time telemetry and execution metrics across your distributed background tasks.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="group relative rounded-3xl border border-white/10 bg-slate-950/40 p-6 overflow-hidden transition-all hover:bg-slate-900/60 hover:border-white/20">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon size={64} className={stat.color} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                <stat.icon size={14} className={stat.color} />
                {stat.label}
              </div>
              <div className="mt-4 text-4xl font-semibold text-white">{stat.value}</div>
            </div>
          </div>
        ))}
      </section>
      
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        {/* Failure Analytics Widget */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 flex flex-col min-h-[350px]">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="text-rose-400" />
            Failure Analytics
          </h2>
          {Object.keys(data?.failuresByCategory || {}).length > 0 ? (
            <div className="flex-1 flex flex-col md:flex-row items-center gap-8">
              <div className="w-full h-64 md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(data.failuresByCategory).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {Object.keys(data.failuresByCategory).map((_, index) => {
                        const colors = ['#f43f5e', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#64748b'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 flex flex-col gap-3">
                {Object.entries(data.failuresByCategory).map(([category, count]: [string, any], index) => {
                  const percentage = data.dlq?.permanentFailures > 0 ? Math.round((count / data.dlq.permanentFailures) * 100) : 0;
                  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-violet-500', 'bg-slate-500'];
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`}></span>
                          {category}
                        </span>
                        <span className="text-slate-500 font-mono">{count} ({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No failure data available yet.
            </div>
          )}
        </div>
        
        {/* Top Failed Queues */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <BarChart2 className="text-amber-400" />
            Top Failed Queues
          </h2>
          {data?.topFailedQueues && data.topFailedQueues.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topFailedQueues} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  />
                  <Bar dataKey="failedCount" name="Failed Jobs" fill="#fbbf24" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm pb-8">
              No failed queues to report.
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
         {/* Most Retried Jobs */}
         <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <RefreshCw className="text-fuchsia-400" />
            Most Retried Jobs
          </h2>
          {data?.mostRetriedJobs && data.mostRetriedJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Job Name</th>
                    <th className="px-4 py-3 font-medium">Queue</th>
                    <th className="px-4 py-3 font-medium rounded-tr-lg text-right">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.mostRetriedJobs.map((job: any) => (
                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-slate-200 font-medium">{job.name}</td>
                      <td className="px-4 py-3 text-slate-400">{job.queue?.name || "Unknown"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold rounded bg-rose-500/10 text-rose-400">
                          {job.attemptCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex items-center justify-center text-slate-500 text-sm">
              No jobs with multiple retries.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold text-sky-50 flex items-center gap-2 mb-4">
              <Activity className="text-sky-400" />
              Real-time Metrics (Last Hour)
            </h2>
            {metricsData?.timeSeries?.length > 0 ? (
              <div className="h-48 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsData.timeSeries.map((d: any) => ({ ...d, time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e9" opacity={0.2} vertical={false} />
                    <XAxis dataKey="time" stroke="#bae6fd" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#bae6fd" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#082f49', border: '1px solid #0284c7', borderRadius: '8px' }}
                      itemStyle={{ color: '#e0f2fe' }}
                    />
                    <Bar dataKey="completed" name="Completed" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="failed" name="Failed" fill="#fb7185" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retrying" name="Retrying" fill="#e879f9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sky-200/50 text-sm">
                Waiting for metric data...
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-sky-400/20">
             <div className="flex justify-between text-sm mb-2 text-sky-200"><span>Worker Capacity Utilization</span><span>{metricsData?.currentUtilization || 0}%</span></div>
             <div className="w-full h-2 rounded-full bg-sky-950 overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${metricsData?.currentUtilization || 0}%` }}></div>
             </div>
          </div>
        </div>
      </section>

      {alertsData && alertsData.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6">
            <h2 className="text-xl font-semibold text-rose-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-rose-400" />
              Active System Alerts
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {alertsData.map((alert: any) => (
                <div key={alert.id} className="rounded-xl border border-rose-500/20 bg-rose-950/40 p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-rose-200">{alert.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/20 text-rose-300">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-rose-200/80">{alert.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
