import React from "react";
import { format, differenceInMilliseconds } from "date-fns";
import { CheckCircle, Clock, Play, XCircle, RefreshCw, Archive } from "lucide-react";

interface TimelineViewerProps {
  job: any;
  executions: any[];
}

export function TimelineViewer({ job, executions }: TimelineViewerProps) {
  // Build a chronological list of events
  const events: any[] = [];
  
  const addEvent = (name: string, timestamp: string | null, status: string, icon: any, color: string, meta?: any) => {
    if (timestamp) {
      events.push({ name, timestamp: new Date(timestamp), status, icon, color, meta });
    }
  };

  addEvent("Created", job.createdAt, "CREATED", Clock, "text-slate-400", { correlationId: job.correlationId });
  
  if (job.availableAt && job.availableAt !== job.createdAt) {
     addEvent("Scheduled", job.availableAt, "SCHEDULED", Clock, "text-amber-400");
  } else {
     addEvent("Queued", job.createdAt, "QUEUED", Clock, "text-sky-400");
  }

  // Map executions to timeline
  executions.forEach((exec, i) => {
    if (exec.retryDelayMs) {
      const scheduledAt = new Date(new Date(exec.startedAt).getTime() - exec.retryDelayMs).toISOString();
      addEvent(`Retry Scheduled (Attempt ${exec.attemptNumber})`, scheduledAt, "RETRY_SCHEDULED", Clock, "text-fuchsia-400", {
        backoff: `${exec.retryDelayMs}ms delay`
      });
    }

    addEvent(`Claimed (Attempt ${exec.attemptNumber})`, exec.startedAt, "CLAIMED", Play, "text-amber-400", { correlationId: exec.correlationId });
    if (exec.finishedAt) {
       if (exec.status === "SUCCEEDED") {
         addEvent(`Completed (Attempt ${exec.attemptNumber})`, exec.finishedAt, "COMPLETED", CheckCircle, "text-emerald-400");
       } else if (exec.status === "FAILED") {
         addEvent(`Failed (Attempt ${exec.attemptNumber})`, exec.finishedAt, "FAILED", XCircle, "text-rose-400", { failureCategory: exec.failureCategory });
       }
    }
  });

  if (job.status === "DEAD_LETTERED") {
    addEvent("Dead Lettered", job.deadLetteredAt || job.updatedAt, "DEAD_LETTERED", Archive, "text-purple-400");
  } else if (job.status === "CANCELLED") {
    addEvent("Cancelled", job.updatedAt, "CANCELLED", XCircle, "text-slate-400");
  } else if (job.status === "COMPLETED" && (!executions.length || executions[executions.length-1].status !== "SUCCEEDED")) {
    addEvent("Completed", job.completedAt, "COMPLETED", CheckCircle, "text-emerald-400");
  } else if (job.status === "FAILED" && (!executions.length || executions[executions.length-1].status !== "FAILED")) {
    addEvent("Failed", job.failedAt, "FAILED", XCircle, "text-rose-400");
  }

  // Sort events chronologically
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate durations between consecutive events
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="py-4">
      <div className="relative border-l border-white/10 ml-4 space-y-6">
        {events.map((event, i) => {
          const isLast = i === events.length - 1;
          const nextEvent = !isLast ? events[i + 1] : null;
          const duration = nextEvent ? formatDuration(nextEvent.timestamp.getTime() - event.timestamp.getTime()) : null;

          return (
            <div key={i} className="relative pl-6">
              <div className={`absolute -left-[9px] top-1 rounded-full bg-slate-900 border ${event.color.replace('text', 'border')} p-1`}>
                 <event.icon size={10} className={event.color} />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-sm font-medium ${event.color}`}>{event.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{format(event.timestamp, "HH:mm:ss.SSS")}</span>
                  {event.meta?.correlationId && (
                    <span className="bg-slate-800/50 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700/50" title="Correlation ID">
                      {event.meta.correlationId.split('-')[0]}
                    </span>
                  )}
                  {event.meta?.failureCategory && (
                    <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-rose-500/20">
                      {event.meta.failureCategory}
                    </span>
                  )}
                  {event.meta?.backoff && (
                    <span className="bg-fuchsia-500/10 text-fuchsia-400 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-fuchsia-500/20">
                      {event.meta.backoff}
                    </span>
                  )}
                </div>
                {duration && (
                  <div className="absolute top-6 -left-[20px] text-[10px] text-slate-500 font-mono tracking-wider rotate-90 origin-left opacity-50">
                    {duration}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
