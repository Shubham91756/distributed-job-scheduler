# 07. Testing Strategy

This document outlines the rigorous testing methodology applied to the Distributed Job Scheduler to guarantee reliability in high-concurrency environments.

## Frameworks
- **Test Runner:** Vitest (chosen for native ESM support, execution speed, and seamless mocking).
- **Assertion Library:** Chai (bundled via Vitest).
- **Mocking Strategy:** `vi.mock()` intercepts `prisma` exports, bypassing network I/O during strict unit tests.

## 1. Unit Testing Strategy
Unit tests target distinct algorithmic components without requiring a live PostgreSQL instance.

### Target Areas:
- **Retry Engine (`worker/src/tests/retry.test.ts`):** 
  - Validates `ExponentialBackoff` calculations.
  - Ensures `Jitter` randomization stays within the 80%-100% mathematical boundary.
- **Worker Executor (`worker/src/tests/executor.test.ts`):**
  - Confirms graceful timeout handling when an asynchronous job block exceeds its `timeoutSeconds` budget.
  - Verifies state transitions (`RUNNING` -> `FAILED` -> `DEAD_LETTER_PENDING`).
- **Auth Controller (`backend/src/tests/unit/auth.test.ts`):**
  - Verifies bcrypt hashing intercepts.
  - Confirms `loginAttempts` threshold triggers immediate 403 lockouts without database corruption.

## 2. Integration Testing Strategy
Integration tests validate the boundaries between the Express API and the Prisma ORM layer.

### Target Areas:
- **API Payloads (`backend/src/tests/integration/jobs.api.test.ts`):**
  - Sends malformed JSON to the enqueue endpoint to assert `Zod` validation boundaries.
  - Ensures valid inputs trigger Prisma `$transaction` wraps securely.
- **Security Intercepts (`backend/src/tests/security/security.test.ts`):**
  - Tests Header injection.
  - Verifies JWT malformation returns a standardized 401 response without exposing stack traces.

## 3. Concurrency & Reliability Validation
Due to the architectural complexity of `FOR UPDATE SKIP LOCKED`, standard unit tests are insufficient. The architecture mandates manual E2E validation:
1. **Thundering Herd Simulation:** Bombarding the API with 10,000 requests.
2. **Crash Simulation:** Force-killing a worker container (`SIGKILL`) while `RUNNING`, validating the Scheduler's `Recovery Engine` successfully detects the stale heartbeat and re-queues the orphaned job.

## Coverage Requirements
- Any modifications to the `Worker Executor` or `Retry` math require 100% line coverage due to their criticality.
- API Route controllers require 80% coverage on primary business paths.
