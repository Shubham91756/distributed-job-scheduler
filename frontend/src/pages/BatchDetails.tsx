import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { format } from "date-fns";
import { Layers, ArrowLeft, RefreshCw, StopCircle, CheckCircle2, XCircle, Clock, PlayCircle } from "lucide-react";

export function BatchDetails() {
	const { id } = useParams<{ id: string }>();
	const queryClient = useQueryClient();

	const { data: batchData, isLoading: isLoadingBatch } = useQuery({
		queryKey: ["batch", id],
		queryFn: async () => {
			const res = await api.get(`/batches/${id}`);
			return res.data.data.batch;
		},
		refetchInterval: 3000
	});

	const { data: jobsData, isLoading: isLoadingJobs } = useQuery({
		queryKey: ["batch-jobs", id],
		queryFn: async () => {
			const res = await api.get(`/batches/${id}/jobs?limit=100`); // fetch up to 100 for now
			return res.data.data.jobs;
		},
		refetchInterval: 3000
	});

	const retryMutation = useMutation({
		mutationFn: async (failedOnly: boolean) => {
			await api.post(`/batches/${id}/retry`, { failedOnly });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["batch", id] });
			queryClient.invalidateQueries({ queryKey: ["batch-jobs", id] });
		}
	});

	const cancelMutation = useMutation({
		mutationFn: async () => {
			await api.post(`/batches/${id}/cancel`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["batch", id] });
			queryClient.invalidateQueries({ queryKey: ["batch-jobs", id] });
		}
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

	const getJobStatusIcon = (status: string) => {
		switch (status) {
			case "COMPLETED": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
			case "FAILED":
			case "DEAD_LETTERED": return <XCircle className="w-4 h-4 text-rose-500" />;
			case "RUNNING": return <PlayCircle className="w-4 h-4 text-sky-500" />;
			case "CANCELLED": return <StopCircle className="w-4 h-4 text-slate-500" />;
			case "QUEUED":
			case "SCHEDULED": return <Clock className="w-4 h-4 text-amber-500" />;
			case "RETRYING": return <RefreshCw className="w-4 h-4 text-orange-500" />;
			default: return <Clock className="w-4 h-4 text-slate-500" />;
		}
	};

	if (isLoadingBatch) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	if (!batchData) {
		return <div className="p-8 text-center text-slate-400">Batch not found</div>;
	}

	return (
		<div className="p-8 max-w-7xl mx-auto space-y-8">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<Link to="/batches" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
						<ArrowLeft className="w-4 h-4" />
						Back to Batches
					</Link>
					<h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
						<Layers className="w-8 h-8 text-indigo-400" />
						{batchData.name}
					</h1>
					<p className="text-slate-400">ID: {batchData.id}</p>
				</div>
				<div className="flex gap-3">
					{(batchData.status === "QUEUED" || batchData.status === "RUNNING") && (
						<button
							onClick={() => {
								if (confirm("Cancel this batch?")) cancelMutation.mutate();
							}}
							disabled={cancelMutation.isPending}
							className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
						>
							<StopCircle className="w-4 h-4 text-amber-400" />
							Cancel Batch
						</button>
					)}
					{["COMPLETED", "FAILED", "PARTIALLY_COMPLETED", "CANCELLED"].includes(batchData.status) && (
						<>
							<button
								onClick={() => {
									if (confirm("Retry failed jobs in this batch?")) retryMutation.mutate(true);
								}}
								disabled={retryMutation.isPending}
								className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
							>
								<RefreshCw className="w-4 h-4 text-orange-400" />
								Retry Failed
							</button>
							<button
								onClick={() => {
									if (confirm("Retry ALL jobs in this batch? This will re-execute completed jobs.")) retryMutation.mutate(false);
								}}
								disabled={retryMutation.isPending}
								className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
							>
								<RefreshCw className="w-4 h-4 text-indigo-400" />
								Retry All
							</button>
						</>
					)}
				</div>
			</div>

			{/* Progress Card */}
			<div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-semibold text-white">Batch Overview</h2>
					<span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getStatusColor(batchData.status)}`}>
						{batchData.status}
					</span>
				</div>
				
				<div className="mb-8">
					<div className="flex justify-between text-sm text-slate-300 mb-2">
						<span>Progress: {batchData.progress.toFixed(1)}%</span>
						<span>{batchData.completedJobs + batchData.failedJobs + batchData.cancelledJobs} / {batchData.totalJobs} Jobs</span>
					</div>
					<div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
						<div style={{ width: `${(batchData.completedJobs / batchData.totalJobs) * 100}%` }} className="h-full bg-emerald-500 transition-all duration-500"></div>
						<div style={{ width: `${(batchData.failedJobs / batchData.totalJobs) * 100}%` }} className="h-full bg-rose-500 transition-all duration-500"></div>
						<div style={{ width: `${(batchData.cancelledJobs / batchData.totalJobs) * 100}%` }} className="h-full bg-slate-500 transition-all duration-500"></div>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
					<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
						<div className="text-sm text-slate-400 mb-1">Total Jobs</div>
						<div className="text-2xl font-semibold text-white">{batchData.totalJobs}</div>
					</div>
					<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
						<div className="text-sm text-emerald-400 mb-1">Completed</div>
						<div className="text-2xl font-semibold text-white">{batchData.completedJobs}</div>
					</div>
					<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
						<div className="text-sm text-sky-400 mb-1">Running</div>
						<div className="text-2xl font-semibold text-white">{batchData.runningJobs}</div>
					</div>
					<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
						<div className="text-sm text-rose-400 mb-1">Failed</div>
						<div className="text-2xl font-semibold text-white">{batchData.failedJobs}</div>
					</div>
					<div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
						<div className="text-sm text-slate-400 mb-1">Cancelled</div>
						<div className="text-2xl font-semibold text-white">{batchData.cancelledJobs}</div>
					</div>
				</div>
			</div>

			{/* Child Jobs List */}
			<div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
				<div className="p-6 border-b border-slate-800 flex justify-between items-center">
					<h2 className="text-xl font-semibold text-white">Child Jobs</h2>
					<div className="text-sm text-slate-400">Showing up to 100 jobs</div>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-slate-800/50 border-b border-slate-700">
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Job Name</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Attempts</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Created</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800">
							{isLoadingJobs ? (
								<tr>
									<td colSpan={4} className="px-6 py-8 text-center text-slate-500">
										<div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
									</td>
								</tr>
							) : jobsData?.length === 0 ? (
								<tr>
									<td colSpan={4} className="px-6 py-8 text-center text-slate-500">
										No child jobs found.
									</td>
								</tr>
							) : (
								jobsData?.map((job: any) => (
									<tr key={job.id} className="hover:bg-slate-800/30 transition-colors group">
										<td className="px-6 py-3">
											<Link to={`/jobs/${job.id}`} className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline">
												{job.name}
											</Link>
										</td>
										<td className="px-6 py-3">
											<div className="flex items-center gap-2">
												{getJobStatusIcon(job.status)}
												<span className="text-sm text-slate-300">{job.status}</span>
											</div>
										</td>
										<td className="px-6 py-3 text-sm text-slate-400">
											{job.attemptCount} / {job.maxAttempts}
										</td>
										<td className="px-6 py-3 text-sm text-slate-400">
											{format(new Date(job.createdAt), "HH:mm:ss.SSS")}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
