import type { RequestHandler } from "express";
import { ZodSchema, ZodError } from "zod";

export const validate = (schemas: { body?: ZodSchema; query?: ZodSchema; params?: ZodSchema }): RequestHandler => {
	return (req, _res, next) => {
		try {
			if (schemas.params) {
				req.params = schemas.params.parse(req.params);
			}
			if (schemas.query) {
				req.query = schemas.query.parse(req.query);
			}
			if (schemas.body) {
				req.body = schemas.body.parse(req.body);
			}
			next();
		} catch (error) {
			if (error instanceof ZodError) {
				const formatted = error.errors.map((e) => ({
					field: e.path.join("."),
					message: e.message,
				}));
				return next({
					statusCode: 400,
					message: "Validation failed",
					errors: formatted,
				});
			}
			next(error);
		}
	};
};
