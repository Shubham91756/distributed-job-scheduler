import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { useProjectContext } from "../../context/ProjectContext";

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue?: any | null; 
  onSuccess: () => void;
}

export function QueueModal({ isOpen, onClose, queue, onSuccess }: QueueModalProps) {
  const { activeProjectId } = useProjectContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [maxConcurrency, setMaxConcurrency] = useState(5);
  const [status, setStatus] = useState("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (queue) {
        setName(queue.name);
        setDescription(queue.description || "");
        setPriority(queue.priority);
        setMaxConcurrency(queue.maxConcurrency);
        setStatus(queue.status);
      } else {
        setName("");
        setDescription("");
        setPriority("MEDIUM");
        setMaxConcurrency(5);
        setStatus("ACTIVE");
      }
      setError(null);
    }
  }, [isOpen, queue]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (queue) {
        await api.put(`/queues/${queue.id}`, { name, description, priority, maxConcurrency, status });
      } else {
        await api.post(`/queues/project/${activeProjectId}`, { name, description, priority, maxConcurrency, status });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message;
      const details = err.response?.data?.errors;
      if (details && Array.isArray(details) && details.length > 0) {
        setError(`${errorMessage}: ${details.map((d: any) => d.message).join(", ")}`);
      } else {
        setError(errorMessage || "An error occurred");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {queue ? "Edit Queue" : "Create Queue"}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Queue Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              placeholder="e.g. Email Notifications"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
              placeholder="What kind of jobs run here?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Max Concurrency</label>
              <input
                type="number"
                required
                min={1}
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
          </div>

          {queue && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {queue ? "Save Changes" : "Create Queue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
