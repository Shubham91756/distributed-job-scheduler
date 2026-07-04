import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
	standardHeaders: true,
	legacyHeaders: false,
	message: { status: "error", message: "Too many requests, please try again later." }
});

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 failed login/auth attempts per window
	standardHeaders: true,
	legacyHeaders: false,
	message: { status: "error", message: "Too many authentication attempts, please try again later." }
});

export const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 100, // Limit each IP to 100 requests per minute
	standardHeaders: true,
	legacyHeaders: false,
	message: { status: "error", message: "API rate limit exceeded." }
});
