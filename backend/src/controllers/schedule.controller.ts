import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/appError";
const cronParser = require("cron-parser");

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
	const { queueId, projectId, name, jobTemplate, scheduleType, cronExpression, timezone, startAt, endAt } = req.body;

	if (!queueId || !projectId || !name || !jobTemplate || !scheduleType) {
		throw new AppError(400, "Missing required fields");
	}

	let nextRunAt: Date | null = null;
	if (scheduleType === "CRON" || scheduleType === "RECURRING") {
		if (!cronExpression) throw new AppError(400, "CRON/RECURRING schedule requires a cronExpression");
		try {
			const interval = cronParser.parseExpression(cronExpression, { tz: timezone || "UTC", startDate: startAt, endDate: endAt });
			nextRunAt = interval.next().toDate();
		} catch (err: any) {
			throw new AppError(400, `Invalid cron expression: ${err.message}`);
		}
	} else if (scheduleType === "DELAYED" || scheduleType === "SCHEDULED") {
		if (!startAt) throw new AppError(400, "DELAYED/SCHEDULED type requires startAt");
		nextRunAt = new Date(startAt);
	}

	const schedule = await prisma.scheduleDefinition.create({
		data: {
			queueId,
			projectId,
			name,
			jobTemplate,
			scheduleType,
			cronExpression,
			timezone: timezone || "UTC",
			startAt: startAt ? new Date(startAt) : null,
			endAt: endAt ? new Date(endAt) : null,
			nextRunAt,
			enabled: true,
		},
	});

	res.status(201).json({ status: "success", data: schedule });
});

export const updateSchedule = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const name = req.body.name as string;
	const jobTemplate = req.body.jobTemplate;
	const scheduleType = req.body.scheduleType as any;
	const cronExpression = req.body.cronExpression as string | undefined;
	const timezone = req.body.timezone as string | undefined;
	const startAt = req.body.startAt as string | undefined;
	const endAt = req.body.endAt as string | undefined;
	const enabled = req.body.enabled as boolean | undefined;

	const existing = await prisma.scheduleDefinition.findUnique({ where: { id } });
	if (!existing) throw new AppError(404, "Schedule not found");

	let nextRunAt = existing.nextRunAt;
	const updatedType = scheduleType || existing.scheduleType;
	const updatedCron = cronExpression !== undefined ? cronExpression : existing.cronExpression;
	const updatedTz = timezone || existing.timezone;
	const updatedStart = startAt !== undefined ? (startAt ? new Date(startAt) : null) : existing.startAt;
	const updatedEnd = endAt !== undefined ? (endAt ? new Date(endAt) : null) : existing.endAt;

	if ((updatedType === "CRON" || updatedType === "RECURRING") && enabled !== false) {
		if (!updatedCron) throw new AppError(400, "CRON/RECURRING schedule requires a cronExpression");
		try {
			const interval = cronParser.parseExpression(updatedCron, { tz: updatedTz || "UTC", startDate: updatedStart || new Date(), endDate: updatedEnd || undefined });
			nextRunAt = interval.next().toDate();
		} catch (err: any) {
			throw new AppError(400, `Invalid cron expression: ${err.message}`);
		}
	} else if ((updatedType === "DELAYED" || updatedType === "SCHEDULED") && enabled !== false) {
		if (!updatedStart) throw new AppError(400, "DELAYED/SCHEDULED type requires startAt");
		nextRunAt = updatedStart;
	}

	if (enabled === false) {
		nextRunAt = null;
	} else if (existing.enabled === false && enabled === true) {
		// Just resumed, recalculate if needed
		if (updatedType === "CRON" || updatedType === "RECURRING") {
			try {
				const interval = cronParser.parseExpression(updatedCron as string, { tz: updatedTz || "UTC", startDate: updatedStart || new Date(), endDate: updatedEnd || undefined });
				nextRunAt = interval.next().toDate();
			} catch (err) {}
		}
	}

	const updated = await prisma.scheduleDefinition.update({
		where: { id },
		data: {
			name,
			jobTemplate,
			scheduleType,
			cronExpression,
			timezone,
			startAt: startAt ? new Date(startAt) : undefined,
			endAt: endAt ? new Date(endAt) : undefined,
			enabled,
			nextRunAt,
		},
	});

	res.status(200).json({ status: "success", data: updated });
});

export const getSchedules = asyncHandler(async (req: Request, res: Response) => {
	const { queueId, projectId } = req.query;
	const schedules = await prisma.scheduleDefinition.findMany({
		where: {
			queueId: queueId ? String(queueId) : undefined,
			projectId: projectId ? String(projectId) : undefined,
		},
		orderBy: { createdAt: "desc" },
		include: {
			queue: { select: { name: true } },
			project: { select: { name: true } }
		}
	});
	res.status(200).json({ status: "success", data: schedules });
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const schedule = await prisma.scheduleDefinition.findUnique({
		where: { id },
		include: { queue: { select: { name: true } } }
	});
	if (!schedule) throw new AppError(404, "Schedule not found");
	res.status(200).json({ status: "success", data: schedule });
});

export const deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	await prisma.scheduleDefinition.delete({ where: { id } });
	res.status(204).send();
});

export const toggleSchedule = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const enabled = req.body.enabled as boolean;

	const existing = await prisma.scheduleDefinition.findUnique({ where: { id } });
	if (!existing) throw new AppError(404, "Schedule not found");

	let nextRunAt = existing.nextRunAt;
	if (enabled === false) {
		nextRunAt = null;
	} else if (enabled === true) {
		if ((existing.scheduleType === "CRON" || existing.scheduleType === "RECURRING") && existing.cronExpression) {
			try {
				const interval = cronParser.parseExpression(existing.cronExpression, { tz: existing.timezone || "UTC", startDate: existing.startAt || new Date(), endDate: existing.endAt || undefined });
				nextRunAt = interval.next().toDate();
			} catch (err) {}
		} else if (existing.scheduleType === "DELAYED" || existing.scheduleType === "SCHEDULED") {
			nextRunAt = existing.startAt;
		}
	}

	const updated = await prisma.scheduleDefinition.update({
		where: { id },
		data: { enabled, nextRunAt },
	});

	res.status(200).json({ status: "success", data: updated });
});

export const previewNextRuns = asyncHandler(async (req: Request, res: Response) => {
	const { cronExpression, timezone, startAt, endAt } = req.body;
	if (!cronExpression) throw new AppError(400, "cronExpression required");

	try {
		const interval = cronParser.parseExpression(cronExpression, {
			tz: timezone || "UTC",
			startDate: startAt ? new Date(startAt) : new Date(),
			endDate: endAt ? new Date(endAt) : undefined,
		});

		const nextRuns = [];
		for (let i = 0; i < 5; i++) {
			try {
				if (interval.hasNext()) {
					nextRuns.push(interval.next().toDate());
				}
			} catch (e) {
				break;
			}
		}
		res.status(200).json({ status: "success", data: nextRuns });
	} catch (err: any) {
		throw new AppError(400, `Invalid cron expression: ${err.message}`);
	}
});
