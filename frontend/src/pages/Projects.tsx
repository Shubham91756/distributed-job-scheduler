import React, { useState } from "react";
import { FolderKanban, Plus, Search, Edit2, Trash2 } from "lucide-react";
import { Project, useProjectContext } from "../context/ProjectContext";
import { ProjectModal } from "../components/modals/ProjectModal";
import { DeleteConfirmModal } from "../components/modals/DeleteConfirmModal";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export function Projects() {
  const { projects, isLoading } = useProjectContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [search, setSearch] = useState("");

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
             <FolderKanban className="text-indigo-400" /> 
             Projects
          </h2>
          <p className="mt-1 text-sm text-slate-400">Manage your workspaces, queues, and background jobs.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap"
        >
          <Plus size={18} />
          Create Project
        </button>
      </div>

      <div className="flex items-center gap-4 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..." 
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-500 py-1"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-md p-12 text-center text-slate-400">
           <FolderKanban size={48} className="mx-auto mb-4 opacity-20" />
           <p className="text-lg text-slate-300 font-medium mb-2">No projects found</p>
           <p className="text-sm mb-6">Get started by creating a new project namespace.</p>
           <button 
             onClick={() => setIsCreateModalOpen(true)}
             className="inline-flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white transition-colors"
           >
             <Plus size={16} /> Create your first project
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="group relative rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-md p-5 hover:bg-white/5 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link to={`/projects/${project.id}`} className="text-lg font-semibold text-white hover:text-indigo-400 transition-colors">
                    {project.name}
                  </Link>
                  <p className="text-xs text-slate-500 font-mono mt-1">{project.slug}</p>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setProjectToEdit(project)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setProjectToDelete(project)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-slate-400 line-clamp-2 min-h-[2.5rem]">
                {project.description || "No description provided."}
              </p>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 uppercase tracking-wide
                    ${project.isActive ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-slate-400/30 bg-slate-400/10 text-slate-300'}`}>
                    {project.isActive ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> : null}
                    {project.isActive ? 'Active' : 'Inactive'}
                </span>
                
                <span>Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectModal 
        isOpen={isCreateModalOpen || !!projectToEdit} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setProjectToEdit(null);
        }}
        project={projectToEdit}
      />
      
      <DeleteConfirmModal 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        project={projectToDelete}
      />
    </div>
  );
}
