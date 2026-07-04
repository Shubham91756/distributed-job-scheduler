import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { format } from "date-fns";
import { Calendar, Clock, Plus, Trash2, Power, PowerOff, Activity } from "lucide-react";
import { CreateScheduleModal } from "../components/CreateScheduleModal";

export function Schedules() {
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const queryClient = useQueryClient();

	const { data: schedules, isLoading } = useQuery({
		queryKey: ["schedules"],
		queryFn: async () => {
			const res = await api.get("/schedules");
			return res.data.data;
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			await api.delete(`/schedules/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
	});

	const toggleMutation = useMutation({
		mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
			await api.patch(`/schedules/${id}/toggle`, { enabled });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
		},
	});

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="p-8 max-w-7xl mx-auto">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
						<Calendar className="w-8 h-8 text-purple-400" />
						Schedules
					</h1>
					<p className="text-slate-400">Manage recurring and scheduled jobs</p>
				</div>
				<button
					onClick={() => setIsCreateModalOpen(true)}
					className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20"
				>
					<Plus className="w-5 h-5" />
					Create Schedule
				</button>
			</div>

			<div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="bg-slate-800/50 border-b border-slate-700">
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Name</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Type</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Schedule</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Queue</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Next Run</th>
								<th className="px-6 py-4 text-sm font-semibold text-slate-300">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800">
							{schedules?.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center text-slate-500">
										<Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
										<p>No schedules found.</p>
									</td>
								</tr>
							) : (
								schedules?.map((schedule: any) => (
									<tr key={schedule.id} className="hover:bg-slate-800/30 transition-colors group">
										<td className="px-6 py-4">
											<div className="font-medium text-white">{schedule.name}</div>
											<div className="text-xs text-slate-500 font-mono mt-1">
												Project: {schedule.project?.name}
											</div>
										</td>
										<td className="px-6 py-4">
											<span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
												{schedule.scheduleType}
											</span>
										</td>
										<td className="px-6 py-4">
											{schedule.scheduleType === "CRON" ? (
												<div className="flex flex-col">
													<span className="font-mono text-emerald-400 text-sm">{schedule.cronExpression}</span>
													<span className="text-xs text-slate-500">{schedule.timezone}</span>
												</div>
											) : (
												<div className="text-slate-400 text-sm">One-off</div>
											)}
										</td>
										<td className="px-6 py-4">
											<span className="text-slate-300 text-sm">{schedule.queue?.name}</span>
										</td>
										<td className="px-6 py-4">
											<button
												onClick={() => toggleMutation.mutate({ id: schedule.id, enabled: !schedule.enabled })}
												className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
													schedule.enabled
														? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
														: "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
												}`}
											>
												{schedule.enabled ? <Activity className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
												{schedule.enabled ? "Active" : "Paused"}
											</button>
										</td>
										<td className="px-6 py-4">
											{schedule.nextRunAt ? (
												<div className="flex items-center gap-2 text-sm text-slate-300">
													<Clock className="w-4 h-4 text-slate-500" />
													{format(new Date(schedule.nextRunAt), "MMM d, yyyy HH:mm:ss")}
												</div>
											) : (
												<span className="text-slate-500 text-sm">-</span>
											)}
										</td>
										<td className="px-6 py-4">
											<div className="flex items-center gap-2">
												<button
													onClick={() => {
														if (confirm("Are you sure you want to delete this schedule?")) {
															deleteMutation.mutate(schedule.id);
														}
													}}
													className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
													title="Delete Schedule"
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
				<CreateScheduleModal
					onClose={() => setIsCreateModalOpen(false)}
					onSuccess={() => {
						setIsCreateModalOpen(false);
						queryClient.invalidateQueries({ queryKey: ["schedules"] });
					}}
				/>
			)}
		</div>
	);
}
