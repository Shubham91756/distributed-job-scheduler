export type Environment = "development" | "test" | "production";

export type UserRole = "ADMIN" | "MEMBER";

export interface AuthenticatedUser {
	id: string;
	email: string;
	role: UserRole;
}

export interface PaginationQuery {
	page?: number;
	limit?: number;
}
