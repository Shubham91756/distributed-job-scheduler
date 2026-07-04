import React, { useState, useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { api } from "../../services/api";

interface DeleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any | null;
  onSuccess: () => void;
}

export function DeleteJobModal({ isOpen, onClose, job, onSuccess }: DeleteJobModalProps) {
  const [confirmId, setConfirmId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmId("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  const shortId = job.id.split('-')[0];
  const isMatch = confirmId === shortId;

  const handleDelete = async () => {
    if (!isMatch) return;
    
    setError(null);
    setIsSubmitting(true);

    try {
      await api.delete(`/jobs/${job.id}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/20 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-500/20 bg-rose-500/5">
          <h2 className="text-xl font-semibold text-rose-400 flex items-center gap-2">
            <AlertTriangle size={24} />
            Delete Job
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2 text-slate-300 text-sm">
            <p>
              You are about to delete the job <span className="font-semibold text-white">"{job.name}"</span> (ID: {shortId}).
            </p>
            <p className="text-rose-400">
              This action will permanently mark this job as deleted and it will be removed from all active processing queues.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-slate-300">
              Type <span className="font-bold text-white select-none">{shortId}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmId}
              onChange={(e) => setConfirmId(e.target.value)}
              className="w-full bg-slate-950 border border-rose-500/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              placeholder={shortId}
              autoComplete="off"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isMatch || isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Delete Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
