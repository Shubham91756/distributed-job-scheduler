import React from "react";
import { formatDistanceToNow, format, differenceInMilliseconds } from "date-fns";
import { Edit2, XCircle, RefreshCw, Trash2, Activity } from "lucide-react";

interface JobsTableProps {
  jobs: any[];
  isLoading: boolean;
  sortConfig: { key: string; direction: "asc" | "desc" } | null;
  onSort: (key: string) => void;
  onRowClick: (job: any) => void;
  onEdit: (job: any, e: React.MouseEvent) => void;
  onCancel: (job: any, e: React.MouseEvent) => void;
  onRetry: (job: any, e: React.MouseEvent) => void;
  onDelete: (job: any, e: React.MouseEvent) => void;
}

export function JobsTable({
  jobs,
  isLoading,
  sortConfig,
  onSort,
  onRowClick,
  onEdit,
  onCancel,
  onRetry,
  onDelete
}: JobsTableProps) {
  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <span className="opacity-0 group-hover:opacity-50 ml-1">↕</span>;
    return <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>;
  };

  const getStatusColor = (status: string) => {
    if (status === "COMPLETED") return "text-emerald-300 border-emerald-400/30 bg-emerald-400/10";
    if (status === "FAILED") return "text-rose-300 border-rose-400/30 bg-rose-400/10";
    if (status === "RUNNING") return "text-amber-300 border-amber-400/30 bg-amber-400/10";
    if (status === "QUEUED" || status === "SCHEDULED") return "text-sky-300 border-sky-400/30 bg-sky-400/10";
    if (status === "DEAD_LETTERED") return "text-purple-300 border-purple-400/30 bg-purple-400/10";
    return "text-slate-300 border-slate-400/30 bg-slate-400/10";
  };

  const calculateDuration = (startedAt: string | null, completedAt: string | null, failedAt: string | null) => {
    if (!startedAt) return "-";
    const end = completedAt ? new Date(completedAt) : failedAt ? new Date(failedAt) : new Date();
    const ms = differenceInMilliseconds(end, new Date(startedAt));
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Activity size={48} className="mx-auto mb-4 opacity-20" />
        <p>No jobs found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm">
        <thead className="bg-white/5 text-slate-300">
          <tr>
            <th className="px-6 py-4 font-medium group cursor-pointer hover:text-white" onClick={() => onSort("name")}>
              Job Details {getSortIcon("name")}
            </th>
            <th className="px-6 py-4 font-medium group cursor-pointer hover:text-white" onClick={() => onSort("status")}>
              Status {getSortIcon("status")}
            </th>
            <th className="px-6 py-4 font-medium">Type</th>
            <th className="px-6 py-4 font-medium group cursor-pointer hover:text-white" onClick={() => onSort("priority")}>
              Priority {getSortIcon("priority")}
            </th>
            <th className="px-6 py-4 font-medium">Attempts</th>
            <th className="px-6 py-4 font-medium group cursor-pointer hover:text-white" onClick={() => onSort("createdAt")}>
              Created {getSortIcon("createdAt")}
            </th>
            <th className="px-6 py-4 font-medium group cursor-pointer hover:text-white" onClick={() => onSort("duration")}>
              Duration {getSortIcon("duration")}
            </th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 text-slate-100">
          {jobs.map((job: any) => (
            <tr key={job.id} className="group hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onRowClick(job)}>
              <td className="px-6 py-4 font-medium flex flex-col gap-1">
                <span className="text-sm text-slate-200">{job.name || "Unnamed Job"}</span>
                <span className="font-mono text-[10px] text-slate-500">{job.id.split('-')[0]}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${getStatusColor(job.status)}`}>
                  {job.status === 'RUNNING' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>}
                  {job.status}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-300 text-xs">
                 {job.scheduled?.isRecurring ? "Recurring" : job.scheduled?.nextRunAt ? "Scheduled/Delayed" : "Immediate"}
              </td>
              <td className="px-6 py-4">
                <span className={`text-xs font-semibold ${
                  job.priority === 'CRITICAL' ? 'text-rose-400' :
                  job.priority === 'HIGH' ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                  {job.priority}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-400 text-xs font-mono">{job.attemptCount} / {job.maxAttempts}</td>
              <td className="px-6 py-4 text-slate-400 text-xs flex flex-col gap-1">
                <span>{format(new Date(job.createdAt), "MMM d, HH:mm")}</span>
                <span className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
              </td>
              <td className="px-6 py-4 text-slate-400 text-xs font-mono">
                 {calculateDuration(job.startedAt, job.completedAt, job.failedAt)}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {["QUEUED", "SCHEDULED"].includes(job.status) && (
                    <>
                      <button onClick={(e) => onEdit(job, e)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-colors" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={(e) => onCancel(job, e)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors" title="Cancel">
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                  {["FAILED", "DEAD_LETTERED", "CANCELLED"].includes(job.status) && (
                    <button onClick={(e) => onRetry(job, e)} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors" title="Retry">
                      <RefreshCw size={16} />
                    </button>
                  )}
                  <button onClick={(e) => onDelete(job, e)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
