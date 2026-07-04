import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Play, Pause, ListTree, MoreVertical, Search, Archive, Trash2, Edit2 } from "lucide-react";
import { useProjectContext } from "../context/ProjectContext";
import { useState } from "react";
import { QueueModal } from "../components/modals/QueueModal";
import { QueueDetailsDrawer } from "../components/modals/QueueDetailsDrawer";
import { DeleteQueueModal } from "../components/modals/DeleteQueueModal";
import { formatDistanceToNow } from "date-fns";

export function Queues() {
  const { activeProjectId: projectId, isLoading: isProjectsLoading } = useProjectContext();

  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<any | null>(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [queueForDrawer, setQueueForDrawer] = useState<any | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<any | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["queues", projectId],
    queryFn: async () => {
      const res = await api.get(`/queues/project/${projectId}`);
      return res.data.data.queues;
    },
    enabled: !!projectId
  });

  const handleCreateQueue = () => {
    setSelectedQueue(null);
    setIsQueueModalOpen(true);
  };

  const handleEditQueue = (queue: any) => {
    setSelectedQueue(queue);
    setIsQueueModalOpen(true);
    setIsDrawerOpen(false);
  };

  const handleDeleteQueue = (queue: any) => {
    setQueueToDelete(queue);
    setIsDeleteModalOpen(true);
    setIsDrawerOpen(false);
  };

  const handleOpenDrawer = (queue: any) => {
    setQueueForDrawer(queue);
    setIsDrawerOpen(true);
  };

  const handleToggleStatus = async (queueId: string, action: "pause" | "resume" | "archive") => {
    try {
      await api.post(`/queues/${queueId}/${action}`);
      refetch();
      if (queueForDrawer && queueForDrawer.id === queueId) {
        setIsDrawerOpen(false); // Close drawer to force refresh or just re-fetch
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isProjectsLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm">Loading Queues...</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
           <ListTree size={48} className="opacity-20" />
           <p className="text-sm">No project found. Please create a project first.</p>
        </div>
      </div>
    );
  }

  const queues = data || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
             <ListTree className="text-sky-400" /> 
             Message Queues
          </h2>
          <p className="mt-1 text-sm text-slate-400">Manage queue lifecycles, concurrency limits, and retry policies.</p>
        </div>
        {queues.length > 0 && (
          <button 
            onClick={handleCreateQueue}
            className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2 text-sm font-semibold text-white transition-colors shadow-lg shadow-sky-500/20"
          >
            Create Queue
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-md overflow-hidden">
        {queues.length === 0 ? (
           <div className="p-16 flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 rounded-full bg-sky-500/10 flex items-center justify-center mb-6">
                <ListTree size={48} className="text-sky-400/50" />
             </div>
             <h3 className="text-xl font-semibold text-white mb-2">No queues created</h3>
             <p className="text-slate-400 max-w-md mx-auto mb-8">
               Queues are logical lanes for your background jobs. Create your first queue to start processing work.
             </p>
             <button 
                onClick={handleCreateQueue}
                className="rounded-xl bg-sky-500 hover:bg-sky-400 px-6 py-3 text-sm font-semibold text-white transition-colors shadow-lg shadow-sky-500/20"
              >
                Create Queue
              </button>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Queue Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Concurrency</th>
                  <th className="px-6 py-4 font-medium">Pending</th>
                  <th className="px-6 py-4 font-medium">Running</th>
                  <th className="px-6 py-4 font-medium">Completed</th>
                  <th className="px-6 py-4 font-medium">Failed</th>
                  <th className="px-6 py-4 font-medium">Created At</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-slate-100">
                {queues.map((queue: any) => {
                  const pending = queue.jobStats?.['QUEUED'] || 0;
                  const running = queue.jobStats?.['RUNNING'] || 0;
                  const completed = queue.jobStats?.['COMPLETED'] || 0;
                  const failed = queue.jobStats?.['FAILED'] || 0;
                  
                  return (
                    <tr 
                      key={queue.id} 
                      className="group hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => handleOpenDrawer(queue)}
                    >
                      <td className="px-6 py-4 font-medium flex flex-col">
                        <span>{queue.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal font-mono">{queue.id.split('-')[0]}...</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide
                          ${queue.status === 'ACTIVE' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 
                            queue.status === 'PAUSED' ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' :
                            'border-slate-500/30 bg-slate-500/10 text-slate-400'}`}>
                          {queue.status === 'ACTIVE' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>}
                          {queue.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{queue.priority}</td>
                      <td className="px-6 py-4 text-slate-300">{queue.maxConcurrency}</td>
                      <td className="px-6 py-4">
                        <span className="text-sky-300 bg-sky-400/10 px-2 py-1 rounded-md">{pending}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-amber-300 bg-amber-400/10 px-2 py-1 rounded-md">{running}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded-md">{completed}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-rose-300 bg-rose-400/10 px-2 py-1 rounded-md">{failed}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {formatDistanceToNow(new Date(queue.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors" 
                          title="Edit"
                          onClick={() => handleEditQueue(queue)}
                        >
                          <Edit2 size={16} />
                        </button>
                        {queue.status === 'ACTIVE' ? (
                          <button 
                            className="text-amber-400 hover:text-amber-300 p-2 hover:bg-amber-400/10 rounded-lg transition-colors" 
                            title="Pause"
                            onClick={() => handleToggleStatus(queue.id, "pause")}
                          >
                            <Pause size={16} />
                          </button>
                        ) : queue.status === 'PAUSED' ? (
                          <button 
                            className="text-emerald-400 hover:text-emerald-300 p-2 hover:bg-emerald-400/10 rounded-lg transition-colors" 
                            title="Resume"
                            onClick={() => handleToggleStatus(queue.id, "resume")}
                          >
                            <Play size={16} />
                          </button>
                        ) : null}
                        <button 
                          className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-400/10 rounded-lg transition-colors" 
                          title="Delete"
                          onClick={() => handleDeleteQueue(queue)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QueueModal 
        isOpen={isQueueModalOpen} 
        onClose={() => setIsQueueModalOpen(false)} 
        queue={selectedQueue} 
        onSuccess={refetch} 
      />

      <QueueDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        queue={queueForDrawer}
        onEdit={() => queueForDrawer && handleEditQueue(queueForDrawer)}
        onDelete={() => queueForDrawer && handleDeleteQueue(queueForDrawer)}
        onToggleStatus={(action) => queueForDrawer && handleToggleStatus(queueForDrawer.id, action)}
      />

      <DeleteQueueModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        queue={queueToDelete}
        onSuccess={refetch}
      />
    </div>
  );
}
