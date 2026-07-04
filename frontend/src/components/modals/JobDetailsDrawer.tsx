import React, { useState, useEffect } from "react";
import { X, Play, Pause, Archive, Trash2, Edit2, Activity, Settings, Clock, BarChart2, RefreshCw, XCircle, CheckCircle, Terminal } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { RetrySimulator } from "./RetrySimulator";
import { api } from "../../services/api";

import { TimelineViewer } from "../jobs/TimelineViewer";
import { PayloadViewer } from "../jobs/PayloadViewer";
import { ExecutionHistory } from "../jobs/ExecutionHistory";
import { LogViewer } from "../jobs/LogViewer";

interface JobDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export function JobDetailsDrawer({ isOpen, onClose, job, onEdit, onDelete, onRetry, onCancel }: JobDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "executions" | "logs" | "recoveries">("overview");
  const [executions, setExecutions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingExtras, setIsLoadingExtras] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      setActiveTab("overview");
      fetchExtras();
    }
  }, [isOpen, job]);

  const fetchExtras = async () => {
    if (!job) return;
    setIsLoadingExtras(true);
    try {
      const [execRes, logRes] = await Promise.all([
        api.get(`/jobs/${job.id}/executions`),
        api.get(`/jobs/${job.id}/logs`)
      ]);
      setExecutions(execRes.data.data.executions || []);
      setLogs(logRes.data.data.logs || []);
    } catch (e) {
      console.error("Failed to fetch job extras", e);
    } finally {
      setIsLoadingExtras(false);
    }
  };

  if (!isOpen || !job) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-semibold text-white">{job.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide
                ${job.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                  job.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  job.status === 'RUNNING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  job.status === 'DEAD_LETTERED' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  'bg-sky-500/10 text-sky-400 border border-sky-500/20'}`}>
                {job.status}
              </span>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                <span>ID: {job.id}</span>
                {job.idempotencyKey && <span className="bg-white/5 px-1.5 py-0.5 rounded text-sky-400">Idempotent</span>}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchExtras} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors" title="Refresh Data">
              <RefreshCw size={18} className={isLoadingExtras ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6 border-b border-white/10 bg-slate-950/30 text-sm font-medium">
          <button 
            className={`py-4 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`py-4 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'executions' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            onClick={() => setActiveTab('executions')}
          >
            Executions
            <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded-full">{executions.length}</span>
          </button>
          <button 
            className={`py-4 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            onClick={() => setActiveTab('logs')}
          >
            Logs
            <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded-full">{logs.length}</span>
          </button>
          {job.recoveries && job.recoveries.length > 0 && (
            <button 
              className={`py-4 border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'recoveries' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              onClick={() => setActiveTab('recoveries')}
            >
              Recoveries
              <span className="bg-white/10 text-xs px-1.5 py-0.5 rounded-full">{job.recoveries.length}</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-900/50">
          
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* Configuration */}
                <div className="lg:col-span-3 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <Settings size={16} className="text-sky-400" />
                    Configuration
                  </h3>
                  <div className="bg-slate-950/80 rounded-xl border border-white/5 p-5 grid grid-cols-2 gap-y-6 gap-x-4">
                    <div className="col-span-2">
                      <span className="text-xs text-slate-500 block mb-1">Description</span>
                      <p className="text-sm text-slate-200">{job.description || "No description provided."}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Priority</span>
                      <span className={`text-sm font-semibold ${
                          job.priority === 'CRITICAL' ? 'text-rose-400' :
                          job.priority === 'HIGH' ? 'text-amber-400' :
                          'text-slate-200'
                        }`}>
                        {job.priority}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Attempts</span>
                      <span className="text-sm font-medium text-slate-200">{job.attemptCount} / {job.maxAttempts}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Target Queue</span>
                      <span className="text-sm font-medium text-slate-200">{job.queue?.name || "Unknown"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Created By</span>
                      <span className="text-sm font-medium text-slate-200">{job.createdBy?.name || "System"}</span>
                    </div>
                    
                    {job.scheduled?.isRecurring && (
                      <div className="col-span-2 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                         <span className="text-xs text-sky-400 font-semibold block mb-1">Cron Expression</span>
                         <span className="text-sm font-mono text-sky-200">{job.scheduled.cronExpression}</span>
                         <span className="text-xs text-sky-400/60 ml-3">Next run: {formatDistanceToNow(new Date(job.scheduled.nextRunAt), { addSuffix: true })}</span>
                      </div>
                    )}
                    
                    {job.status === "RETRYING" && job.availableAt && (
                      <div className="col-span-2 p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg">
                         <span className="text-xs text-fuchsia-400 font-semibold block mb-1">Pending Retry</span>
                         <span className="text-sm text-fuchsia-200">Will retry {formatDistanceToNow(new Date(job.availableAt), { addSuffix: true })}</span>
                         <span className="text-xs text-fuchsia-400/60 ml-3">({format(new Date(job.availableAt), 'PPpp')})</span>
                      </div>
                    )}

                    {job.retryPolicy && (
                      <div className="col-span-2 p-3 bg-slate-800/50 border border-white/5 rounded-lg space-y-4">
                         <div className="flex items-center justify-between pb-2 border-b border-white/10">
                            <div>
                              <h4 className="text-white font-medium">{job.retryPolicy.name}</h4>
                              <p className="text-xs text-slate-400">
                                {job.retryPolicy.strategy.replace(/_/g, " ")} • {job.retryPolicy.maxAttempts} attempts
                              </p>
                            </div>
                         </div>
                         <RetrySimulator
                            strategy={job.retryPolicy.strategy}
                            maxAttempts={job.retryPolicy.maxAttempts}
                            delaySeconds={job.retryPolicy.delaySeconds}
                            backoffFactor={job.retryPolicy.backoffFactor}
                            maxDelaySeconds={job.retryPolicy.maxDelaySeconds}
                            jitter={job.retryPolicy.jitter}
                          />
                      </div>
                    )}
                    {job.leaseExpiresAt && job.status === 'RUNNING' && (
                      <div className="col-span-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                         <span className="text-xs text-amber-400 font-semibold block mb-1">Lease Expiration</span>
                         <span className="text-sm font-mono text-amber-200">{format(new Date(job.leaseExpiresAt), 'PPpp')}</span>
                         <span className="text-xs text-amber-400/60 ml-3">Expires {formatDistanceToNow(new Date(job.leaseExpiresAt), { addSuffix: true })}</span>
                      </div>
                    )}
                    
                    {job.timeoutSeconds && (
                      <div className="col-span-2 p-3 bg-slate-800/50 border border-white/5 rounded-lg">
                         <span className="text-xs text-slate-400 font-semibold block mb-1">Timeout Config</span>
                         <span className="text-sm font-mono text-slate-200">{job.timeoutSeconds} seconds</span>
                      </div>
                    )}

                    {job.cancellationRequested && (
                      <div className="col-span-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                         <span className="text-xs text-rose-400 font-semibold block mb-1">Cancellation Requested</span>
                         <span className="text-sm text-rose-200">A cancellation request has been sent to the worker processing this job. It will abort cooperatively.</span>
                      </div>
                    )}

                    {job.deadLetter && (
                      <div className="col-span-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                         <span className="text-xs text-purple-400 font-semibold block mb-1">Dead Letter Details</span>
                         <span className="text-sm font-semibold text-purple-300 block">{job.deadLetter.reason}</span>
                         <span className="text-xs text-purple-200 mt-1 block">Final Attempt: {format(new Date(job.deadLetter.finalAttemptAt), 'PPpp')}</span>
                         <span className="text-xs text-purple-200 block truncate max-w-full" title={job.deadLetter.lastError}>
                             Error: {job.deadLetter.lastError}
                         </span>
                         {job.deadLetter.recoveredAt && (
                             <span className="text-xs text-emerald-400 mt-1 block font-semibold">
                                 Recovered At: {format(new Date(job.deadLetter.recoveredAt), 'PPpp')}
                             </span>
                         )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <Clock size={16} className="text-amber-400" />
                    Timeline
                  </h3>
                  <div className="bg-slate-950/80 rounded-xl border border-white/5 p-4 h-full">
                     <TimelineViewer job={job} executions={executions} />
                  </div>
                </div>
              </div>

              {/* Payload */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                  <Activity size={16} className="text-emerald-400" />
                  Job Payload
                </h3>
                <PayloadViewer payload={job.payload} />
              </div>
            </div>
          )}

          {activeTab === "executions" && (
            <ExecutionHistory executions={executions} />
          )}

          {activeTab === "logs" && (
            <LogViewer logs={logs} />
          )}

          {activeTab === "recoveries" && job.recoveries && (
            <div className="space-y-3">
              {job.recoveries.map((recovery: any) => (
                <div key={recovery.id} className="bg-slate-950/80 rounded-xl border border-white/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      recovery.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                      recovery.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-sky-500/10 text-sky-400'
                    }`}>
                      {recovery.status === 'SUCCESS' ? <CheckCircle size={20} /> :
                       recovery.status === 'FAILED' ? <XCircle size={20} /> :
                       <RefreshCw size={20} className="animate-spin-slow" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-medium">Recovery Attempt</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          recovery.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          recovery.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        }`}>
                          {recovery.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1 block">Recovered by: {recovery.recoveredBy}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono text-slate-300 block">{format(new Date(recovery.recoveredAt), "MMM d, yyyy")}</span>
                    <span className="text-xs font-mono text-slate-500">{format(new Date(recovery.recoveredAt), "HH:mm:ss")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex flex-col sm:flex-row gap-3">
          {["QUEUED", "SCHEDULED"].includes(job.status) && (
            <button
              onClick={onEdit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
            >
              <Edit2 size={16} /> Edit
            </button>
          )}
          
          {["QUEUED", "SCHEDULED", "RUNNING"].includes(job.status) && (
            <button
              onClick={onCancel}
              disabled={job.cancellationRequested}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                job.cancellationRequested 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400"
              }`}
            >
              <XCircle size={16} /> {job.status === "RUNNING" ? "Request Cancel" : "Cancel"}
            </button>
          )}

          {["FAILED", "DEAD_LETTERED", "CANCELLED"].includes(job.status) && (
            <button
              onClick={onRetry}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} /> Retry
            </button>
          )}

          <div className="flex-1 hidden sm:block"></div>
          
          <button
            onClick={onDelete}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-sm font-medium transition-colors"
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>

      </div>
    </>
  );
}
