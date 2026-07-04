import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Search, Filter, AlertCircle, CheckCircle, Info, AlertTriangle, Clock } from "lucide-react";

export function Activity() {
	const [searchTerm, setSearchTerm] = useState("");
	const [severity, setSeverity] = useState<string>("");
	const [service, setService] = useState<string>("");

	const { data, isLoading } = useQuery({
		queryKey: ["system-events", severity, service, searchTerm],
		queryFn: async () => {
			const res = await api.get("/system-events", {
				params: { severity, service, search: searchTerm, limit: 100 }
			});
			return res.data.data;
		},
		refetchInterval: 5000,
	});

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
			<section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-sm uppercase tracking-[0.3em] text-fuchsia-300">Observability</p>
						<h1 className="mt-3 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
							Global Activity Feed
						</h1>
						<p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
							Real-time stream of cluster-wide operational events.
						</p>
					</div>
					<div className="flex gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
							<input
								type="text"
								placeholder="Search correlation ID or msg..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="h-10 w-64 rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-fuchsia-500/50 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-all"
							/>
						</div>
						<select
							value={severity}
							onChange={(e) => setSeverity(e.target.value)}
							className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white focus:border-fuchsia-500/50 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-all"
						>
							<option value="">All Severities</option>
							<option value="INFO">INFO</option>
							<option value="WARN">WARN</option>
							<option value="ERROR">ERROR</option>
							<option value="CRITICAL">CRITICAL</option>
						</select>
						<select
							value={service}
							onChange={(e) => setService(e.target.value)}
							className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white focus:border-fuchsia-500/50 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 transition-all"
						>
							<option value="">All Services</option>
							<option value="API">API</option>
							<option value="WORKER">WORKER</option>
							<option value="SCHEDULER">SCHEDULER</option>
						</select>
					</div>
				</div>
			</section>

			<section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-xl">
				{isLoading ? (
					<div className="flex h-64 items-center justify-center">
						<div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
					</div>
				) : (
					<div className="space-y-4">
						{data?.events?.map((event: any) => {
							const Icon = event.severity === "CRITICAL" ? AlertCircle : event.severity === "ERROR" ? AlertTriangle : event.severity === "WARN" ? AlertTriangle : Info;
							const color = event.severity === "CRITICAL" ? "text-rose-500" : event.severity === "ERROR" ? "text-red-400" : event.severity === "WARN" ? "text-amber-400" : "text-sky-400";
							
							return (
								<div key={event.id} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
									<div className={`mt-1 ${color}`}>
										<Icon size={20} />
									</div>
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="text-sm font-semibold text-white">{event.eventType}</span>
												<span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 bg-black/30 ${color}`}>
													{event.severity}
												</span>
												<span className="text-[10px] uppercase tracking-wider text-slate-400 border border-slate-700 bg-slate-800/50 px-2 py-0.5 rounded-full">
													{event.service}
												</span>
											</div>
											<div className="flex items-center gap-2 text-xs text-slate-400">
												<Clock size={12} />
												{new Date(event.timestamp).toLocaleString()}
											</div>
										</div>
										<p className="mt-2 text-sm text-slate-300">
											{event.message || "No message provided."}
										</p>
										{event.correlationId && (
											<p className="mt-2 text-[11px] font-mono text-slate-500">
												Correlation ID: {event.correlationId}
											</p>
										)}
									</div>
								</div>
							);
						})}
						{(!data?.events || data.events.length === 0) && (
							<div className="py-12 text-center text-sm text-slate-400">
								No events found matching your criteria.
							</div>
						)}
					</div>
				)}
			</section>
		</div>
	);
}
