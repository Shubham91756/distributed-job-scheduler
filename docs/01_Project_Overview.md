# 01. Project Overview

## Problem Statement
Modern distributed applications heavily rely on background job processing for tasks like sending emails, processing data pipelines, and executing delayed tasks. Historically, this has required deploying complex message brokers like Redis, RabbitMQ, or Kafka. Operating these brokers introduces significant infrastructure complexity, network overhead, and potential data loss if not configured for strict persistence. 

The goal was to create a robust, resilient, and high-performance job scheduling engine that operates natively on a standard relational database (PostgreSQL), eliminating the need for a secondary data store while preserving enterprise-grade reliability and concurrency guarantees.

## Objectives
- Build a multi-tenant distributed job scheduler with a highly concurrent background worker pool.
- Ensure strict transactional consistency (exactly-once or at-least-once execution) by leveraging PostgreSQL transactional locks.
- Provide a rich, observable ecosystem including Dead Letter Queues (DLQ), Automatic Retry Policies, Batch Processing, and an interactive UI Dashboard.

## Scope
The project scope encompasses:
1. **API Server:** Express.js REST API providing job queuing, status tracking, and configuration management.
2. **Worker Engine:** A resilient worker runtime executing the queued jobs concurrently.
3. **Scheduler Daemon:** A chronometer process that transitions delayed, scheduled, and recurring jobs to the active execution queue.
4. **Dashboard:** A React application for monitoring platform health and job states.

## Functional Requirements
- Users can create organizations, projects, and queues.
- Jobs can be submitted as immediate, delayed (relative), scheduled (absolute time), or recurring (cron).
- Jobs can be submitted in batches.
- Jobs that fail can be automatically retried based on configurable policies (Linear, Exponential) with Jitter.
- Exhausted jobs are routed to a Dead Letter Queue for analysis and manual recovery.
- The system must capture detailed execution logs and system events.

## Non Functional Requirements
- **High Concurrency:** Hundreds of worker threads must be able to claim jobs simultaneously without race conditions.
- **Reliability:** No jobs can be lost during worker crashes (handled via lease timeouts and the Recovery Engine).
- **Security:** JWT authentication and authorization at the organizational and project levels.
- **Observability:** Centralized logging of system actions (System Event Bus) and execution tracing.
- **Scalability:** The worker and backend must be independently scalable horizontally.

## Expected Outcomes
A production-ready infrastructure stack deployable via Docker Compose or Kubernetes, complete with comprehensive API documentation, CI/CD pipelines, and robust operational playbooks.
