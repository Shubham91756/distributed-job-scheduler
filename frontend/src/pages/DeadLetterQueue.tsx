import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Archive, RefreshCcw, Trash2, Search, Filter, Download } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export function DeadLetterQueue() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [queueId, setQueueId] = useState("");
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dlq", page, search, queueId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      if (search) params.append("search", search);
      if (queueId) params.append("queueId", queueId);
      
      const res = await api.get(`/dead-letters?${params.toString()}`);
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const handleRetry = async (id: string) => {
    try {
      await api.post(`/dead-letters/${id}/retry`);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/dead-letters/${id}`);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurge = async () => {
    if (!window.confirm("Are you sure you want to delete all dead letter jobs?")) return;
    try {
      await api.delete(`/dead-letters/purge${queueId ? `?queueId=${queueId}` : ""}`);
      refetch();
    } catch (e) {
      console.error(e);
    }
  };
  
  const handleRetryAll = async () => {
      if (!window.confirm("Are you sure you want to retry all dead letter jobs?")) return;
      try {
          await api.post(`/dead-letters/retry-all`, { queueId: queueId || undefined });
          refetch();
      } catch(e) {
          console.error(e);
      }
  };

  const handleExportCSV = async () => {
    window.open(`http://localhost:4000/api/dead-letters/export/csv`, '_blank');
  };

  const handleExportJSON = async () => {
    window.open(`http://localhost:4000/api/dead-letters/export/json`, '_blank');
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm">Loading Dead Letter Queue...</p>
        </div>
      </div>
    );
  }

  const dlqJobs = data?.deadLetterJobs || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
             <Archive className="text-rose-500" /> 
             Dead Letter Queue
          </h2>
          <p className="mt-1 text-sm text-slate-400">Manage jobs that have exhausted all retries or failed permanently.</p>
        </div>
        {total > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 border border-slate-500/20 hover:bg-slate-700/50 transition-colors"
            >
              <Download size={16} />
              CSV
            </button>
            <button 
                onClick={handleExportJSON}
                className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 border border-slate-500/20 hover:bg-slate-700/50 transition-colors"
            >
              <Download size={16} />
              JSON
            </button>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button 
                onClick={handleRetryAll}
                className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors"
            >
              <RefreshCcw size={16} />
              Retry All
            </button>
            <button 
                onClick={handlePurge}
                className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2 text-sm font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors"
            >
              <Trash2 size={16} />
              Purge Queue
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Reason, Error, or Job ID..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>
          <div className="relative w-64">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
              type="text" 
              placeholder="Filter by Queue ID..." 
              value={queueId}
              onChange={(e) => { setQueueId(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-white/10 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>
      </div>

      {dlqJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 py-24 backdrop-blur-xl">
          <div className="rounded-full bg-slate-800/50 p-4 border border-white/5 shadow-inner">
            <Archive size={32} className="text-slate-500" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-white">Empty Dead Letter Queue</h3>
          <p className="mt-2 text-sm text-slate-400">No jobs have permanently failed.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Job / Queue</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Failure Reason</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Retries Exhausted</th>
                  <th className="px-6 py-4 font-medium whitespace-nowrap">Final Attempt At</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {dlqJobs.map((dlq: any) => (
                  <tr key={dlq.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white truncate max-w-[200px]" title={dlq.job.name}>{dlq.job.name}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]" title={dlq.queueName}>{dlq.queueName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-rose-400 font-medium">{dlq.reason}</span>
                            <span className="text-xs text-slate-400 truncate max-w-[300px]" title={dlq.lastError}>{dlq.lastError}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                        {dlq.retryCount}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                       {formatDistanceToNow(new Date(dlq.finalAttemptAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => handleRetry(dlq.id)}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                            title="Retry Job"
                        >
                          <RefreshCcw size={18} />
                        </button>
                        <button 
                            onClick={() => handleDelete(dlq.id)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                            title="Delete Permanently"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
             <div className="flex items-center justify-between border-t border-white/5 px-6 py-4 bg-slate-900/30">
                <span className="text-sm text-slate-400">Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} jobs</span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        disabled={page * 20 >= total}
                        className="px-3 py-1 text-sm bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
