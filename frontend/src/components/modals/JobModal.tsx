import React, { useState, useEffect } from "react";
import { Loader2, X, PlusCircle, Settings, Clock, Calendar, Repeat } from "lucide-react";
import { api } from "../../services/api";
import { useQuery } from "@tanstack/react-query";
import { useProjectContext } from "../../context/ProjectContext";

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  onSuccess: () => void;
}

export function JobModal({ isOpen, onClose, job, onSuccess }: JobModalProps) {
  const { activeProjectId } = useProjectContext();
  
  const { data: queues = [] } = useQuery({
    queryKey: ["queues", activeProjectId],
    queryFn: async () => {
      if (!activeProjectId) return [];
      const res = await api.get(`/queues/project/${activeProjectId}`);
      return res.data.data.queues;
    },
    enabled: isOpen && !!activeProjectId,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [queueId, setQueueId] = useState("");
  const [payloadStr, setPayloadStr] = useState("{\n  \n}");
  const [priority, setPriority] = useState("MEDIUM");
  const [type, setType] = useState("immediate");
  const [delayMs, setDelayMs] = useState<number>(1000);
  const [runAt, setRunAt] = useState("");
  const [cronExpression, setCronExpression] = useState("* * * * *");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (job) {
        setName(job.name);
        setDescription(job.description || "");
        setQueueId(job.queueId);
        setPayloadStr(JSON.stringify(job.payload, null, 2));
        setPriority(job.priority);
        
        if (job.scheduled?.isRecurring) {
          setType("recurring");
          setCronExpression(job.scheduled.cronExpression || "* * * * *");
        } else if (job.scheduled?.nextRunAt && job.status === "SCHEDULED") {
          setType("scheduled");
          // Format date for datetime-local input
          const date = new Date(job.scheduled.nextRunAt);
          setRunAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        } else {
          setType("immediate");
        }
      } else {
        setName("");
        setDescription("");
        setQueueId(queues.length > 0 ? queues[0].id : "");
        setPayloadStr("{\n  \n}");
        setPriority("MEDIUM");
        setType("immediate");
        setDelayMs(1000);
        setRunAt("");
        setCronExpression("* * * * *");
      }
      setError(null);
    }
  }, [isOpen, job, queues]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(payloadStr);
    } catch (e) {
      setError("Payload must be valid JSON");
      setIsSubmitting(false);
      return;
    }

    if (!queueId) {
      setError("Please select a queue");
      setIsSubmitting(false);
      return;
    }

    const requestBody: any = {
      name,
      description,
      payload: parsedPayload,
      priority,
      type
    };

    if (type === "delayed") {
      requestBody.delayMs = delayMs;
    } else if (type === "scheduled") {
      if (!runAt) {
        setError("Please select a run date/time");
        setIsSubmitting(false);
        return;
      }
      requestBody.runAt = new Date(runAt).toISOString();
    } else if (type === "recurring") {
      requestBody.cronExpression = cronExpression;
    }

    try {
      if (job) {
        await api.put(`/jobs/${job.id}`, requestBody);
      } else {
        await api.post(`/jobs/queue/${queueId}`, requestBody);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.errors) {
         const validationErrors = err.response.data.errors.map((e: any) => e.message).join(", ");
         setError(`Validation failed: ${validationErrors}`);
      } else {
         setError(err.response?.data?.message || `Failed to ${job ? "update" : "create"} job`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 shrink-0">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {job ? <Settings className="text-sky-400" /> : <PlusCircle className="text-sky-400" />}
            {job ? "Edit Job" : "Create New Job"}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form id="job-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Job Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  placeholder="e.g. process-user-avatar"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Target Queue</label>
                <select
                  required
                  disabled={!!job} // Cannot change queue once created according to backend API usually, but wait, API allows updating queue? No, updateJob doesn't take queueId.
                  value={queueId}
                  onChange={(e) => setQueueId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50"
                >
                  <option value="" disabled>Select a queue</option>
                  {queues.map((q: any) => (
                    <option key={q.id} value={q.id}>{q.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                placeholder="What does this job do?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">JSON Payload</label>
              <textarea
                value={payloadStr}
                onChange={(e) => setPayloadStr(e.target.value)}
                rows={5}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sky-300 font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                placeholder="{}"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Job Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                >
                  <option value="immediate">Immediate</option>
                  <option value="delayed">Delayed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="recurring">Recurring (Cron)</option>
                </select>
              </div>
            </div>

            {type === "delayed" && (
              <div className="space-y-2 p-4 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-top-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Clock size={16}/> Delay (milliseconds)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={delayMs}
                  onChange={(e) => setDelayMs(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
            )}

            {type === "scheduled" && (
              <div className="space-y-2 p-4 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-top-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Calendar size={16}/> Run At Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={runAt}
                  onChange={(e) => setRunAt(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
            )}

            {type === "recurring" && (
              <div className="space-y-2 p-4 bg-white/5 rounded-xl border border-white/10 animate-in slide-in-from-top-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2"><Repeat size={16}/> Cron Expression</label>
                <input
                  type="text"
                  required
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  placeholder="*/5 * * * *"
                />
                <p className="text-xs text-slate-500 mt-1">Example: */5 * * * * (Every 5 minutes)</p>
              </div>
            )}

          </form>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            form="job-form"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {job ? "Save Changes" : "Create Job"}
          </button>
        </div>
      </div>
    </div>
  );
}
