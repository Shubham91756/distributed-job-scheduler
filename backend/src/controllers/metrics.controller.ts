import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const getTimeSeriesMetrics = asyncHandler(async (req: Request, res: Response) => {
	const { timeRange = "1h" } = req.query;
	
	// Convert timeRange to date
	const now = new Date();
	const startDate = new Date();
	if (timeRange === "1h") startDate.setHours(now.getHours() - 1);
	else if (timeRange === "24h") startDate.setDate(now.getDate() - 1);
	else if (timeRange === "7d") startDate.setDate(now.getDate() - 7);
	else startDate.setHours(now.getHours() - 1); // default 1h

	// To generate time-series, we will bucket events. Since we are using Prisma and raw SQL might be complex across DB engines,
	// we'll fetch system events and group them in memory for this scale, or use a simple raw query for Postgres.
	
	// Using Postgres raw query to bucket by minute (for 1h) or hour (for 24h)
	const interval = timeRange === "1h" ? "minute" : (timeRange === "7d" ? "day" : "hour");
	
	const metrics = await prisma.$queryRawUnsafe(`
		SELECT 
			date_trunc('${interval}', "timestamp") as time,
			COUNT(CASE WHEN "eventType" = 'Job Completed' THEN 1 END)::int as "completed",
			COUNT(CASE WHEN "eventType" = 'Job Failed' THEN 1 END)::int as "failed",
			COUNT(CASE WHEN "eventType" = 'Job Retrying' THEN 1 END)::int as "retrying",
			COUNT(CASE WHEN "eventType" = 'Job Dead Lettered' THEN 1 END)::int as "deadLettered"
		FROM "system_events"
		WHERE "timestamp" >= $1
		GROUP BY 1
		ORDER BY 1 ASC
	`, startDate);

	const workerUtilization = await prisma.worker.aggregate({
		_sum: { capacity: true },
		where: { status: "ONLINE", deletedAt: null }
	});

	const runningJobsCount = await prisma.job.count({
		where: { status: "RUNNING", deletedAt: null }
	});
	
	const totalCapacity = workerUtilization._sum.capacity || 1;
	const currentUtilizationPercent = Math.min(100, Math.round((runningJobsCount / totalCapacity) * 100));

	res.setHeader('Cache-Control', 'public, max-age=15'); // 15 seconds cache
	res.status(200).json({
		status: "success",
		data: {
			timeSeries: metrics,
			currentUtilization: currentUtilizationPercent
		}
	});
});
