import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryEngine } from '../retry/index';
import { Job, RetryPolicy } from '@prisma/client';
import { prisma } from '../db/prisma';

vi.mock('../db/prisma', () => ({
	prisma: {
		job: {
			update: vi.fn(),
		}
	}
}));

describe('Retry Engine - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should calculate exponential backoff correctly', async () => {
		const mockJob = {
			id: 'job-1',
			queueId: 'q-1',
			projectId: 'p-1',
			workerId: null,
			name: 'test',
			payload: {},
			status: 'FAILED',
			priority: 'MEDIUM',
			attemptCount: 1,
			maxAttempts: 3,
			availableAt: null,
			startedAt: null,
			completedAt: null,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date()
		} as unknown as Job;

		const mockPolicy: RetryPolicy = {
			id: 'policy-1',
			name: 'Test Policy',
			strategy: 'EXPONENTIAL_BACKOFF',
			maxAttempts: 3,
			delaySeconds: 10,
			backoffFactor: 2.0 as any,
			maxDelaySeconds: 300,
			version: 1,
			parentId: null,
			isEnabled: true,
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		// 10 * (2.0 ^ 1) = 20 seconds
		const delayMs = RetryEngine.calculateNextRetryDelay(mockPolicy, 2, true);
		
		// The jitter is 80% to 100% of delayMs, so between 16000 and 20000
		expect(delayMs).toBeGreaterThanOrEqual(16000);
		expect(delayMs).toBeLessThanOrEqual(20000);
	});
});
