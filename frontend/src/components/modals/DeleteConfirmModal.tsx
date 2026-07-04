import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { Project, useProjectContext } from "../../context/ProjectContext";
import { useNavigate } from "react-router-dom";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onDeleted?: () => void;
}

export function DeleteConfirmModal({ isOpen, onClose, project, onDeleted }: DeleteConfirmModalProps) {
  const { refetchProjects } = useProjectContext();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      await api.delete(`/projects/${project.id}`);
      await refetchProjects();
      if (onDeleted) {
        onDeleted();
      } else {
        navigate("/projects");
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-rose-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Delete Project</h2>
              <p className="text-sm text-slate-400 mt-1">This action cannot be undone.</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              You are about to permanently delete <strong>{project.name}</strong>. 
              This will also delete all associated queues, jobs, and execution logs.
            </p>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-slate-300">
                Type <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-white">{project.name}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                placeholder="Type project name here"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== project.name || isDeleting}
            className="flex items-center gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting && <Loader2 size={16} className="animate-spin" />}
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
