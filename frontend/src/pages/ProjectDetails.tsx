import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { ArrowLeft, Edit2, Trash2, ListTree, CheckCircle } from "lucide-react";
import { ProjectModal } from "../components/modals/ProjectModal";
import { DeleteConfirmModal } from "../components/modals/DeleteConfirmModal";
import { formatDistanceToNow } from "date-fns";

export function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { data: projectData, isLoading, error, refetch } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data.data.project;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="text-center p-12 text-slate-400">
        <p>Project not found or you don't have access.</p>
        <button onClick={() => navigate("/projects")} className="mt-4 text-indigo-400 hover:underline">
          Return to Projects
        </button>
      </div>
    );
  }

  const project = projectData;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <Link to="/projects" className="flex items-center gap-1 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>

      <div className="bg-slate-950/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide
                  ${project.isActive ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-400/30 bg-slate-400/10 text-slate-300'}`}>
                  {project.isActive ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> : null}
                  {project.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="font-mono text-slate-500 mt-2 text-sm">Slug: {project.slug}</p>
            
            <p className="text-slate-300 mt-6 max-w-2xl">
              {project.description || "No description provided."}
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              <Edit2 size={16} /> Edit
            </button>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/10">
          <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
              <ListTree className="text-sky-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Queues</p>
              <p className="text-2xl font-semibold text-white">{project._count?.queues || 0}</p>
            </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="text-indigo-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Jobs</p>
              <p className="text-2xl font-semibold text-white">{project._count?.jobs || 0}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          <p>Created: {new Date(project.createdAt).toLocaleString()} ({formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })})</p>
          <p>Last Updated: {new Date(project.updatedAt).toLocaleString()}</p>
          {project.owner && <p>Owner: {project.owner.name} ({project.owner.email})</p>}
        </div>
      </div>

      <ProjectModal 
        isOpen={isEditModalOpen} 
        onClose={() => {
          setIsEditModalOpen(false);
          refetch(); // update local data
        }}
        project={project}
      />
      
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        project={project}
      />
    </div>
  );
}
