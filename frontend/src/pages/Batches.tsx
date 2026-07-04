import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Layers, Plus, Trash2, StopCircle, RefreshCw, Activity } from "lucide-react";
import { CreateBatchModal } from "../components/CreateBatchModal";

export function Batches() {
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const queryClient = useQueryClient();

	const { data: batches, isLoading } = useQuery({
		queryKey: ["batches"],
		queryFn: async () => {
			const res = await api.get("/batches");
			return res.data.data;
		},
		refetchInterval: 3000 // Poll every 3 seconds to see progress
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await api.delete(`/batches/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["batches"] });
		},
	});

	const cancelMutation = useMutation({
		mutationFn: async (id: string) => {
			await api.post(`/batches/${id}/cancel`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["batches"] });
		},
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case "COMPLETED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
			case "FAILED": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
			case "RUNNING": return "bg-sky-500/10 text-sky-400 border-sky-500/20";
			case "QUEUED": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
			case "CANCELLED": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
			case "PARTIALLY_COMPLETED": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
			default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="p-8 max-w-7xl mx-auto">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
						<Layers className="w-8 h-8 text-indigo-400" />
						Batches
					</h1>
					<p className="text-slate-400">Manage and monitor large collections of jobs</p>
				</div>
				<button
					onClick={() => setIsCreateModalOpen(true)}
					className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
				>
					<Plus className="w-5 h-5" />
					Create Batch
				</button>
			</div>

			<div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-slate-800/50 border-b border-slate-700">
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Batch Name</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300 w-64">Progress</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300 text-center">Jobs</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Created</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800">
							{batches?.batches?.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center text-slate-500">
										<Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
										<p>No batches found.</p>
									</td>
								</tr>
							) : (
								batches?.batches?.map((batch: any) => (
									<tr key={batch.id} className="hover:bg-slate-800/30 transition-colors group">
										<td className="px-6 py-4">
											<Link to={`/batches/${batch.id}`} className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
												{batch.name}
											</Link>
											<div className="text-xs text-slate-500 font-mono mt-1">
												Project: {batch.project?.name}
											</div>
										</td>
										<td className="px-6 py-4">
											<span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(batch.status)}`}>
												{batch.status}
											</span>
										</td>
										<td className="px-6 py-4">
											<div className="flex flex-col gap-1.5">
												<div className="flex justify-between text-xs text-slate-400">
													<span>{batch.progress.toFixed(1)}%</span>
													<span>{batch.completedJobs + batch.failedJobs + batch.cancelledJobs} / {batch.totalJobs}</span>
												</div>
												<div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
													<div style={{ width: `${(batch.completedJobs / batch.totalJobs) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-500"></div>
													<div style={{ width: `${(batch.failedJobs / batch.totalJobs) * 100}%` }} className="h-full bg-rose-500 transition-all duration-500"></div>
													<div style={{ width: `${(batch.cancelledJobs / batch.totalJobs) * 100}%` }} className="h-full bg-slate-500 transition-all duration-500"></div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center justify-center gap-3 text-xs">
												<div className="text-center" title="Running">
													<div className="text-sky-400 font-medium">{batch.runningJobs}</div>
												</div>
												<div className="text-center" title="Completed">
													<div className="text-emerald-400 font-medium">{batch.completedJobs}</div>
												</div>
												<div className="text-center" title="Failed">
													<div className="text-rose-400 font-medium">{batch.failedJobs}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 text-sm text-slate-300">
											{format(new Date(batch.createdAt), "MMM d, yyyy HH:mm")}
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												{(batch.status === "QUEUED" || batch.status === "RUNNING") && (
													<button
														onClick={() => {
															if (confirm("Cancel this batch?")) {
																cancelMutation.mutate(batch.id);
															}
														}}
														className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
														title="Cancel Batch"
													>
														<StopCircle className="w-4 h-4" />
													</button>
												)}
												<button
													onClick={() => {
														if (confirm("Are you sure you want to delete this batch?")) {
															deleteMutation.mutate(batch.id);
														}
													}}
													className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
													title="Delete Batch"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{isCreateModalOpen && (
				<CreateBatchModal
					onClose={() => setIsCreateModalOpen(false)}
					onSuccess={() => {
						setIsCreateModalOpen(false);
						queryClient.invalidateQueries({ queryKey: ["batches"] });
					}}
				/>
			)}
		</div>
	);
}
