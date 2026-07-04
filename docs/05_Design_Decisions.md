# 05. Design Decisions

This document details the core architectural and technological trade-offs made during the engineering of the Distributed Job Scheduler.

## 1. Why PostgreSQL (State Machine)?
**Problem:** We required a highly atomic, persistent datastore for tracking job state across thousands of concurrent execution requests.
**Decision:** Selected PostgreSQL as the primary message broker and state machine.
**Alternatives:** Redis, RabbitMQ, Kafka.
**Trade-offs:**
- *Pros:* Operational simplicity (one database to manage). ACID compliance guarantees job state is never corrupted. We can natively utilize Foreign Keys linking Organizations to Projects to Queues.
- *Cons:* PostgreSQL is not natively designed as a message queue; high-frequency polling can cause CPU churn and connection exhaustion compared to Redis PUB/SUB.

## 2. Why `FOR UPDATE SKIP LOCKED`?
**Problem:** Multiple independent worker nodes polling the database simultaneously will cause lock contention or duplicate job ingestion (race conditions).
**Decision:** Implemented `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`.
**Trade-offs:**
- *Pros:* Completely eliminates race conditions. If Worker A locks Row 1, Worker B's query skips Row 1 and locks Row 2 immediately, guaranteeing exactly-once acquisition.
- *Cons:* Requires highly optimized composite indexes on the `Job` table to prevent sequential scans during lock acquisition.

## 3. Why Prisma ORM?
**Problem:** Writing raw SQL for complex join hierarchies and atomic batch operations is error-prone and lacks type safety.
**Decision:** Prisma ORM utilized across Backend, Worker, and Scheduler.
**Trade-offs:**
- *Pros:* Strict TypeScript typings inferred directly from the database schema. Greatly simplifies complex `$transaction` logic.
- *Cons:* Prisma's query engine introduces a slight overhead compared to raw `pg` queries.

## 4. Why JWT Authentication?
**Problem:** Need a scalable authentication mechanism for the REST API that doesn't require session lookup on every request.
**Decision:** Stateless JSON Web Tokens (JWT) with long-lived Refresh Tokens stored in DB.
**Trade-offs:**
- *Pros:* Zero database overhead for authenticating active requests.
- *Cons:* Access tokens cannot be revoked before expiration. Mitigated by using 15-minute expirations.

## 5. Why Independent Worker Services?
**Problem:** Background job execution can be CPU-intensive and block the Express API Event Loop.
**Decision:** Decoupled the `worker` into a standalone Node.js daemon.
**Trade-offs:**
- *Pros:* Independent horizontal scaling. If the API is under heavy load, background jobs are unaffected, and vice versa.
- *Cons:* Increased deployment complexity (requires orchestrating multiple containers).

## 6. Why Heartbeats & Lease Expiration?
**Problem:** If a Worker container is `OOMKilled` or forcefully terminated, any jobs in the `RUNNING` state remain permanently stuck.
**Decision:** Workers emit a heartbeat every N seconds. The `Recovery Engine` scans for jobs assigned to workers with stale heartbeats and reverts them to `QUEUED`.
**Trade-offs:**
- *Pros:* Self-healing cluster. No jobs are permanently lost due to infrastructure crashes.
- *Cons:* Heartbeats add continuous write load to the database (`WorkerNode` table).

## 7. Why Dead Letter Queue (DLQ)?
**Problem:** When a job continuously fails (e.g., downstream API is 404), it remains in the queue, endlessly retrying and blocking valid jobs.
**Decision:** Move exhausted jobs (exceeding `maxAttempts`) to a dedicated `DeadLetterJob` table.
**Trade-offs:**
- *Pros:* Keeps the primary `Job` table lean and fast. Separates operational noise from active processing.
- *Cons:* Requires additional UI/API endpoints for administrators to manage and manually retry DLQ jobs.

## 8. Why Batch Processing?
**Problem:** Inserting 10,000 jobs sequentially takes too long and risks partial failure if the network drops halfway.
**Decision:** Implement a `Batch` model that encapsulates bulk inserts within a singular Prisma transaction.
**Trade-offs:**
- *Pros:* Strict atomicity. Either all 10,000 jobs queue, or none do.
- *Cons:* A massive transaction can lock database tables and spike memory usage on the Node process.

## 9. Why Structured System Logging?
**Problem:** Standard `console.log` is difficult to parse and associate with specific tenant Actions.
**Decision:** Abstracted critical lifecycle events into a strongly-typed `SystemEvent` database table.
**Trade-offs:**
- *Pros:* Powers the rich UI Activity Feed natively without requiring an external ELK stack.
- *Cons:* Rapid log ingestion can quickly bloat the database size over time.
