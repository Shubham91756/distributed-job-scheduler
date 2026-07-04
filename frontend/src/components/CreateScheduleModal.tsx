import { useState, useEffect } from "react";
import { X, Calendar, Clock, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

type ScheduleType = "SCHEDULED" | "DELAYED" | "CRON" | "RECURRING";

interface CreateScheduleModalProps {
	onClose: () => void;
	onSuccess: () => void;
}

export function CreateScheduleModal({ onClose, onSuccess }: CreateScheduleModalProps) {
	const [name, setName] = useState("");
	const [projectId, setProjectId] = useState("");
	const [queueId, setQueueId] = useState("");
	const [scheduleType, setScheduleType] = useState<ScheduleType>("SCHEDULED");
	const [cronExpression, setCronExpression] = useState("*/5 * * * *");
	const [timezone, setTimezone] = useState("UTC");
	const [startAt, setStartAt] = useState("");
	const [endAt, setEndAt] = useState("");
	const [jobTemplateStr, setJobTemplateStr] = useState(`{\n  "name": "My Scheduled Job",\n  "priority": "MEDIUM",\n  "maxAttempts": 3,\n  "payload": {}\n}`);
	
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const { data: queues } = useQuery({
		queryKey: ["queues"],
		queryFn: async () => {
			const res = await api.get("/queues");
			return res.data.data;
		},
	});

	const { data: projects } = useQuery({
		queryKey: ["projects"],
		queryFn: async () => {
			const res = await api.get("/projects");
			return res.data.data;
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		try {
			const jobTemplate = JSON.parse(jobTemplateStr);
			setIsLoading(true);

			const payload: any = {
				name,
				projectId,
				queueId,
				scheduleType,
				jobTemplate,
				timezone,
			};

			if (scheduleType === "CRON" || scheduleType === "RECURRING") {
				payload.cronExpression = cronExpression;
			}
			
			if (startAt) {
				payload.startAt = new Date(startAt).toISOString();
			}
			if (endAt) {
				payload.endAt = new Date(endAt).toISOString();
			}

			await api.post("/schedules", payload);
			onSuccess();
		} catch (err: any) {
			if (err instanceof SyntaxError) {
				setError("Invalid JSON in Job Template");
			} else {
				setError(err.response?.data?.message || err.message || "Failed to create schedule");
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
				<div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
					<h2 className="text-xl font-bold text-white flex items-center gap-2">
						<Calendar className="w-5 h-5 text-purple-400" />
						Create Schedule
					</h2>
					<button
						onClick={onClose}
						className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-6 overflow-y-auto custom-scrollbar">
					{error && (
						<div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
							{error}
						</div>
					)}

					<form id="create-schedule-form" onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									Schedule Name *
								</label>
								<input
									type="text"
									required
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
									placeholder="e.g. Nightly Data Export"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									Schedule Type *
								</label>
								<select
									required
									value={scheduleType}
									onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
								>
									<option value="SCHEDULED">One-off Scheduled</option>
									<option value="CRON">Cron (Recurring)</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									Project *
								</label>
								<select
									required
									value={projectId}
									onChange={(e) => setProjectId(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
								>
									<option value="">Select Project</option>
									{projects?.map((p: any) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									Queue *
								</label>
								<select
									required
									value={queueId}
									onChange={(e) => setQueueId(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
								>
									<option value="">Select Queue</option>
									{queues?.map((q: any) => (
										<option key={q.id} value={q.id}>
											{q.name}
										</option>
									))}
								</select>
							</div>
						</div>

						{scheduleType === "CRON" && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-purple-500/5 p-4 rounded-lg border border-purple-500/10">
								<div>
									<label className="block text-sm font-medium text-purple-300 mb-1.5 flex items-center gap-2">
										<RotateCcw className="w-4 h-4" />
										Cron Expression *
									</label>
									<input
										type="text"
										required
										value={cronExpression}
										onChange={(e) => setCronExpression(e.target.value)}
										className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-mono"
										placeholder="*/5 * * * *"
									/>
									<p className="text-xs text-slate-500 mt-2">Standard 5-part cron syntax.</p>
								</div>
								<div>
									<label className="block text-sm font-medium text-purple-300 mb-1.5 flex items-center gap-2">
										<Clock className="w-4 h-4" />
										Timezone
									</label>
									<select
										value={timezone}
										onChange={(e) => setTimezone(e.target.value)}
										className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
									>
										<option value="UTC">UTC</option>
										<option value="America/New_York">America/New_York (EST)</option>
										<option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
										<option value="Europe/London">Europe/London (GMT)</option>
										<option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
									</select>
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									{scheduleType === "CRON" ? "Start At (Optional)" : "Run At *"}
								</label>
								<input
									type="datetime-local"
									required={scheduleType !== "CRON"}
									value={startAt}
									onChange={(e) => setStartAt(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									End At (Optional)
								</label>
								<input
									type="datetime-local"
									value={endAt}
									onChange={(e) => setEndAt(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1.5">
								Job Template (JSON) *
							</label>
							<textarea
								required
								value={jobTemplateStr}
								onChange={(e) => setJobTemplateStr(e.target.value)}
								className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-emerald-400 font-mono text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors custom-scrollbar"
							/>
							<p className="text-xs text-slate-500 mt-2">
								This JSON payload is used to generate the job when the schedule runs.
							</p>
						</div>
					</form>
				</div>

				<div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						form="create-schedule-form"
						disabled={isLoading}
						className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						) : null}
						Create Schedule
					</button>
				</div>
			</div>
		</div>
	);
}
