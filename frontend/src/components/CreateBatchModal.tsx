import { useState } from "react";
import { X, Layers, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

interface CreateBatchModalProps {
	onClose: () => void;
	onSuccess: () => void;
}

export function CreateBatchModal({ onClose, onSuccess }: CreateBatchModalProps) {
	const [name, setName] = useState("");
	const [projectId, setProjectId] = useState("");
	const [queueId, setQueueId] = useState("");
	const [payloadsStr, setPayloadsStr] = useState(`[ \n  { "task": 1 },\n  { "task": 2 }\n]`);
	
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
			const payloads = JSON.parse(payloadsStr);
			if (!Array.isArray(payloads)) {
				throw new Error("Payloads must be a JSON array of objects");
			}
			
			setIsLoading(true);

			await api.post("/batches", {
				name,
				projectId,
				queueId,
				payloads,
			});
			onSuccess();
		} catch (err: any) {
			if (err instanceof SyntaxError) {
				setError("Invalid JSON in Payloads");
			} else {
				setError(err.response?.data?.message || err.message || "Failed to create batch");
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
						<Layers className="w-5 h-5 text-indigo-400" />
						Create Batch Job
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

					<form id="create-batch-form" onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									Batch Name *
								</label>
								<input
									type="text"
									required
									value={name}
									onChange={(e) => setName(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
									placeholder="e.g. Nightly User Sync"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">
									Project *
								</label>
								<select
									required
									value={projectId}
									onChange={(e) => setProjectId(e.target.value)}
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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
									className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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

						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center justify-between">
								<span>Payloads (JSON Array) *</span>
								<span className="text-xs text-slate-500">Max 10,000 jobs</span>
							</label>
							<textarea
								required
								value={payloadsStr}
								onChange={(e) => setPayloadsStr(e.target.value)}
								className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-emerald-400 font-mono text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors custom-scrollbar"
							/>
							<p className="text-xs text-slate-500 mt-2">
								Provide a JSON array where each object represents the payload for a single child job.
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
						form="create-batch-form"
						disabled={isLoading}
						className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{isLoading ? (
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						) : <Activity className="w-4 h-4" />}
						Queue Batch
					</button>
				</div>
			</div>
		</div>
	);
}
