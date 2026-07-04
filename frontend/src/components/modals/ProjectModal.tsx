import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { Project, useProjectContext } from "../../context/ProjectContext";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

export function ProjectModal({ isOpen, onClose, project }: ProjectModalProps) {
  const { organizationId, refetchProjects } = useProjectContext();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setName(project.name);
        setSlug(project.slug);
        setDescription(project.description || "");
      } else {
        setName("");
        setSlug("");
        setDescription("");
      }
      setError(null);
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (project) {
        await api.put(`/projects/${project.id}`, { name, slug, description });
      } else {
        await api.post(`/projects/organization/${organizationId}`, { name, slug, description, organizationId });
      }
      await refetchProjects();
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!project && newName) {
      setSlug(newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            {project ? "Edit Project" : "Create Project"}
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
            <label className="text-sm font-medium text-slate-300">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={handleNameChange}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              placeholder="e.g. E-commerce Backend"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Project Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              placeholder="e.g. e-commerce-backend"
            />
            <p className="text-xs text-slate-500">Lowercase letters, numbers, and hyphens only.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
              placeholder="What is this project for?"
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
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {project ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
