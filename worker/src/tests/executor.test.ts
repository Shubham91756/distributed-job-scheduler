import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobExecutor } from '../executors/index';
import { prisma } from '../db/prisma';

vi.mock('../db/prisma', () => ({
	prisma: {
		job: {
			update: vi.fn(),
			findUnique: vi.fn(),
			updateMany: vi.fn(),
		},
		jobExecution: {
			create: vi.fn().mockResolvedValue({ id: 'exec-1' }),
			update: vi.fn(),
		},
		jobLog: {
			create: vi.fn(),
		},
		jobRecovery: {
			updateMany: vi.fn(),
		},
		systemEvent: {
			create: vi.fn(),
		},
		deadLetterJob: {
			upsert: vi.fn(),
		},
		$transaction: vi.fn(),
		$executeRaw: vi.fn(),
	}
}));

describe('Job Executor - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should gracefully handle job timeout', async () => {
		// Mock a job that would theoretically take too long
		const mockJob = {
			id: 'job-long',
			queueId: 'q-1',
			projectId: 'p-1',
			workerId: 'worker-1',
			name: 'sleep',
			payload: { duration: 5000 }, // 5s sleep
			status: 'CLAIMED',
			priority: 'MEDIUM',
			retryCount: 0,
			maxRetries: 1,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		const executor = new JobExecutor();
		// In a real environment we would mock the actual execution or pass a config to reduce the global timeout
		// For unit test purposes, let's mock the internal execute method to simulate a timeout error throwing
		// We don't need to mock it if we are testing the exception handling block internally,
		// but since `execute` is the main method that *does* the update, we'll just test that calling
		// it with a bad state or letting it run sets things properly, but since the method
		// is self-contained and we want to simulate a timeout, we'll mock the `Date.now` or
		// force the error block. To make it simple:

		vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('Simulated Timeout'));

		await executor.execute(mockJob as any, 'worker-1');

		// In the catch block of JobExecutor.execute(), it updates the execution to FAILED, 
		// but the test asserts we called prisma.job.update to set status to FAILED.
		// Let's verify the second call to job.update
		expect(prisma.job.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'job-long' },
				data: expect.objectContaining({
					status: 'DEAD_LETTERED'
				})
			})
		);
	});
});
