import React from "react";
import { X, Play, Pause, Archive, Trash2, Edit2, Activity, Settings, Clock, BarChart2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { RetrySimulator } from "./RetrySimulator";

interface QueueDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: any | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (action: "pause" | "resume" | "archive") => void;
}

export function QueueDetailsDrawer({ isOpen, onClose, queue, onEdit, onDelete, onToggleStatus }: QueueDetailsDrawerProps) {
  if (!isOpen || !queue) return null;

  const jobStats = queue.jobStats || {};
  const pendingJobs = jobStats["QUEUED"] || 0;
  const runningJobs = jobStats["RUNNING"] || 0;
  const completedJobs = jobStats["COMPLETED"] || 0;
  const failedJobs = jobStats["FAILED"] || 0;
  const deadJobs = jobStats["DEAD_LETTERED"] || 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-semibold text-white">{queue.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide
                ${queue.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  queue.status === 'PAUSED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                {queue.status}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">ID: {queue.id.split('-')[0]}...</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Queue Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
              <Settings size={16} className="text-sky-400" />
              Configuration
            </h3>
            <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 space-y-3">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Description</span>
                <p className="text-sm text-slate-200">{queue.description || "No description provided."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Priority</span>
                  <span className="text-sm font-medium text-slate-200">{queue.priority}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Max Concurrency</span>
                  <span className="text-sm font-medium text-slate-200">{queue.maxConcurrency} jobs</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-xs text-slate-500 block mb-1">Created</span>
                <span className="text-sm text-slate-200">{formatDistanceToNow(new Date(queue.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Job Stats */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
              <BarChart2 size={16} className="text-indigo-400" />
              Job Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/50 rounded-xl border border-sky-500/10 p-4">
                <span className="text-xs text-slate-500 block mb-1">Pending</span>
                <span className="text-2xl font-semibold text-sky-400">{pendingJobs}</span>
              </div>
              <div className="bg-slate-950/50 rounded-xl border border-amber-500/10 p-4">
                <span className="text-xs text-slate-500 block mb-1">Running</span>
                <span className="text-2xl font-semibold text-amber-400">{runningJobs}</span>
              </div>
              <div className="bg-slate-950/50 rounded-xl border border-emerald-500/10 p-4">
                <span className="text-xs text-slate-500 block mb-1">Completed</span>
                <span className="text-2xl font-semibold text-emerald-400">{completedJobs}</span>
              </div>
              <div className="bg-slate-950/50 rounded-xl border border-rose-500/10 p-4">
                <span className="text-xs text-slate-500 block mb-1">Failed</span>
                <span className="text-2xl font-semibold text-rose-400">{failedJobs}</span>
              </div>
              <div className="col-span-2 bg-slate-950/50 rounded-xl border border-white/5 p-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">Dead Letters</span>
                <span className="text-sm font-medium text-slate-300">{deadJobs}</span>
              </div>
            </div>
          </div>

          {/* Failure Analytics */}
          {queue.failuresByCategory && Object.keys(queue.failuresByCategory).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle size={16} className="text-rose-400" />
                Failure Analytics
              </h3>
              <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 space-y-4">
                {Object.entries(queue.failuresByCategory).map(([category, count]: [string, any]) => {
                  const percentage = deadJobs > 0 ? Math.round((count / deadJobs) * 100) : 0;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">{category}</span>
                        <span className="text-slate-500 font-mono">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Retry Policy (Placeholder) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
              <Activity size={16} className="text-rose-400" />
              Retry Policy
            </h3>
            {queue.retryPolicy ? (
              <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div>
                    <h4 className="text-white font-medium">{queue.retryPolicy.name}</h4>
                    <p className="text-xs text-slate-400">
                      {queue.retryPolicy.strategy.replace(/_/g, " ")} • {queue.retryPolicy.maxAttempts} attempts
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/20">
                    Active
                  </span>
                </div>
                <RetrySimulator
                  strategy={queue.retryPolicy.strategy}
                  maxAttempts={queue.retryPolicy.maxAttempts}
                  delaySeconds={queue.retryPolicy.delaySeconds}
                  backoffFactor={queue.retryPolicy.backoffFactor}
                  maxDelaySeconds={queue.retryPolicy.maxDelaySeconds}
                  jitter={queue.retryPolicy.jitter}
                />
              </div>
            ) : (
              <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 text-center">
                <p className="text-sm text-slate-400">No retry policy attached.</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              <Edit2 size={16} /> Edit
            </button>
            {queue.status === 'ACTIVE' ? (
              <button
                onClick={() => onToggleStatus("pause")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-sm font-medium transition-colors"
              >
                <Pause size={16} /> Pause
              </button>
            ) : queue.status === 'PAUSED' ? (
              <button
                onClick={() => onToggleStatus("resume")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors"
              >
                <Play size={16} /> Resume
              </button>
            ) : null}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
             {queue.status !== 'ARCHIVED' && (
              <button
                onClick={() => onToggleStatus("archive")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 text-sm font-medium transition-colors"
              >
                <Archive size={16} /> Archive
              </button>
            )}
            <button
              onClick={onDelete}
              className="col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
