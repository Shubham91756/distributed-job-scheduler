import { FailureCategory } from "@prisma/client";

export class FailureClassifier {
	static classify(error: any): FailureCategory {
		const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
		
		if (errorMessage.includes("timeout") || errorMessage.includes("timed out") || errorMessage.includes("etimedout")) {
			return "TIMEOUT";
		}
		
		if (errorMessage.includes("validation") || errorMessage.includes("invalid") || errorMessage.includes("missing") || errorMessage.includes("schema")) {
			return "VALIDATION";
		}
		
		if (errorMessage.includes("econnrefused") || errorMessage.includes("network") || errorMessage.includes("socket") || errorMessage.includes("dns") || errorMessage.includes("fetch")) {
			return "NETWORK";
		}
		
		if (errorMessage.includes("database") || errorMessage.includes("postgres") || errorMessage.includes("prisma") || errorMessage.includes("deadlock") || errorMessage.includes("constraint")) {
			return "DATABASE";
		}
		
		if (errorMessage.includes("cancel") || errorMessage.includes("abort")) {
			return "CANCELLED";
		}
		
		if (errorMessage.includes("worker crash") || errorMessage.includes("segfault") || errorMessage.includes("out of memory") || errorMessage.includes("oom")) {
			return "WORKER_CRASH";
		}
		
		return "UNKNOWN";
	}
}
