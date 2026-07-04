import React, { useState } from "react";
import { format, differenceInMilliseconds } from "date-fns";
import { Activity, ChevronDown, ChevronRight, CheckCircle, XCircle } from "lucide-react";

interface ExecutionHistoryProps {
  executions: any[];
}

export function ExecutionHistory({ executions }: ExecutionHistoryProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const calculateDuration = (startedAt: string, finishedAt: string | null) => {
    if (!finishedAt) return "Running...";
    const ms = differenceInMilliseconds(new Date(finishedAt), new Date(startedAt));
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (executions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Activity size={32} className="mx-auto mb-3 opacity-20" />
        <p>No executions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {executions.map((exec: any) => {
        const isExpanded = expanded[exec.id];
        
        return (
          <div key={exec.id} className="bg-slate-950/80 rounded-xl border border-white/5 overflow-hidden transition-all">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => toggleExpand(exec.id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 text-sm font-medium">Attempt #{exec.attemptNumber}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border 
                    ${exec.status === 'SUCCEEDED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      exec.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                    {exec.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                 <span className="text-slate-400">Dur: {calculateDuration(exec.startedAt, exec.finishedAt)}</span>
                 <span className="text-slate-500">{exec.id.split('-')[0]}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="p-4 pt-0 border-t border-white/5 bg-slate-900/30">
                {exec.retryDelayMs && (
                  <div className="mt-4 mb-2 p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg">
                    <span className="text-xs text-fuchsia-400 font-semibold block mb-1">Retry Backoff Applied</span>
                    <span className="text-sm text-fuchsia-200">Waited {Math.round(exec.retryDelayMs / 1000)}s before this attempt.</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Started At</span>
                    <span className="text-sm font-mono text-slate-300">{format(new Date(exec.startedAt), "MMM d, yyyy HH:mm:ss.SSS")}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Finished At</span>
                    <span className="text-sm font-mono text-slate-300">{exec.finishedAt ? format(new Date(exec.finishedAt), "MMM d, yyyy HH:mm:ss.SSS") : "-"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block mb-1">Worker</span>
                    <span className="text-sm text-slate-300 bg-white/5 px-2 py-1 rounded">{exec.worker?.name || "Unknown Worker"}</span>
                  </div>
                </div>

                {exec.error && (
                  <div className="mt-4 space-y-2">
                    <span className="text-xs text-rose-500 font-semibold uppercase tracking-wider flex items-center gap-2 block">
                      Failure Trace
                      {exec.failureCategory && (
                        <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded text-[10px]">
                          {exec.failureCategory}
                        </span>
                      )}
                    </span>
                    <div className="p-3 bg-[#0d1117] border border-rose-500/20 rounded-lg overflow-x-auto">
                      <pre className="text-rose-400 text-xs font-mono break-all whitespace-pre-wrap">
                        {exec.error}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
