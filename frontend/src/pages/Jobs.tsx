import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { 
  CheckCircle, 
  RefreshCw, 
  PlusCircle, 
  Activity
} from "lucide-react";
import { useProjectContext } from "../context/ProjectContext";
import { JobModal } from "../components/modals/JobModal";
import { DeleteJobModal } from "../components/modals/DeleteJobModal";
import { JobDetailsDrawer } from "../components/modals/JobDetailsDrawer";
import { JobsTable } from "../components/jobs/JobsTable";
import { JobsFilterBar } from "../components/jobs/JobsFilterBar";

export function Jobs() {
  const { activeProjectId: projectId, isLoading: isProjectsLoading } = useProjectContext();
  const queryClient = useQueryClient();

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{key: string, direction: "asc"|"desc"} | null>(null);

  // Modal state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["jobs", projectId, page, statusFilter, priorityFilter, typeFilter, search, sortConfig],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "20",
        page: page.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(typeFilter && { type: typeFilter }),
        ...(search && { search }),
        ...(sortConfig && { sortBy: sortConfig.key, sortOrder: sortConfig.direction })
      });
      const res = await api.get(`/jobs/project/${projectId}?${params.toString()}`);
      return res.data.data;
    },
    enabled: !!projectId
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/retry`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); refetch(); }
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/cancel`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); refetch(); }
  });

  const openDrawer = (job: any) => {
    setSelectedJob(job);
    setIsDrawerOpen(true);
  };

  const openEditModal = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJob(job);
    setIsDrawerOpen(false);
    setIsJobModalOpen(true);
  };

  const openDeleteModal = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJob(job);
    setIsDrawerOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleRetry = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    retryMutation.mutate(job.id);
  };

  const handleCancel = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    cancelMutation.mutate(job.id);
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === "asc" ? { key, direction: "desc" } : null;
      }
      return { key, direction: "asc" };
    });
  };

  if (isProjectsLoading || (isLoading && !isRefetching)) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm">Loading Jobs...</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <CheckCircle size={48} className="opacity-20" />
           <p className="text-sm">No project found. Please create a project first.</p>
        </div>
      </div>
    );
  }

  const jobs = data?.jobs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
             <Activity className="text-indigo-400" /> 
             Job Management
          </h2>
          <p className="mt-1 text-sm text-slate-400">Create, monitor, and manage background tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()} 
            className="p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
            title="Refresh"
          >
            <RefreshCw size={20} className={isRefetching ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => { setSelectedJob(null); setIsJobModalOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-lg shadow-sky-500/20"
          >
            <PlusCircle size={18} /> Create Job
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-md overflow-hidden flex flex-col">
        <JobsFilterBar 
          search={search} setSearch={setSearch}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          dateRange={dateRange} setDateRange={setDateRange}
          workerFilter={workerFilter} setWorkerFilter={setWorkerFilter}
        />

        <JobsTable 
          jobs={jobs}
          isLoading={isRefetching}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={openDrawer}
          onEdit={openEditModal}
          onCancel={handleCancel}
          onRetry={handleRetry}
          onDelete={openDeleteModal}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Showing page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <JobModal
        isOpen={isJobModalOpen}
        onClose={() => { setIsJobModalOpen(false); setSelectedJob(null); }}
        job={selectedJob}
        onSuccess={() => refetch()}
      />
      
      <DeleteJobModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setSelectedJob(null); }}
        job={selectedJob}
        onSuccess={() => refetch()}
      />

      <JobDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => { setIsDrawerOpen(false); setSelectedJob(null); }}
        job={selectedJob}
        onEdit={() => { setIsDrawerOpen(false); setIsJobModalOpen(true); }}
        onDelete={() => { setIsDrawerOpen(false); setIsDeleteModalOpen(true); }}
        onRetry={() => { if(selectedJob) retryMutation.mutate(selectedJob.id); setIsDrawerOpen(false); }}
        onCancel={() => { if(selectedJob) cancelMutation.mutate(selectedJob.id); setIsDrawerOpen(false); }}
      />
    </div>
  );
}
