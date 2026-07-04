declare global {
	namespace Express {
		interface Request {
			params: Record<string, string>;
			query: Record<string, string>;
			user?: {
				id: string;
				email: string;
			};
		}
	}
}

export {};
