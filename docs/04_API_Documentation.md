# 04. API Documentation

The REST API utilizes standard HTTP verbs and JSON payloads. Authentication is strictly enforced via Bearer JWTs in the `Authorization` header, except for public routes.

---

## 1. Authentication API

### Register User
**Method:** `POST`
**Route:** `/api/v1/auth/register`
**Description:** Register a new tenant owner identity.
**Authentication:** None
**Headers:** `Content-Type: application/json`
**Request Body:**
```json
{
  "email": "user@test.com",
  "password": "strongPassword123!",
  "name": "Jane Doe"
}
```
**Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbG...",
    "refreshToken": "a1b2c3d4..."
  }
}
```
**Possible Errors:**
- `400 Bad Request` (Validation Failed)
- `409 Conflict` (Email already exists)

### Login
**Method:** `POST`
**Route:** `/api/v1/auth/login`
**Description:** Authenticate and retrieve JWT payload. Accounts lock after 5 failed attempts.
**Authentication:** None
**Request Body:**
```json
{
  "email": "user@test.com",
  "password": "strongPassword123!"
}
```
**Response (200 OK):** JWT Token and Refresh Token.
**Possible Errors:**
- `401 Unauthorized` (Invalid credentials)
- `403 Forbidden` (Account Locked)

---

## 2. Organization & Projects

### Create Organization
**Method:** `POST`
**Route:** `/api/v1/orgs`
**Description:** Initialize a new tenant.
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```
**Response (201 Created):** The Organization Object.

### Create Project
**Method:** `POST`
**Route:** `/api/v1/orgs/:orgId/projects`
**Description:** Initialize a project namespace under an Organization.
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "name": "Production Environment",
  "slug": "prod",
  "description": "Live production jobs"
}
```
**Response (201 Created):** The Project Object.

---

## 3. Queue Management

### Create Queue
**Method:** `POST`
**Route:** `/api/v1/projects/:projectId/queues`
**Description:** Establish a named execution lane.
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "name": "email-delivery",
  "priority": "HIGH",
  "maxConcurrency": 10
}
```
**Response (201 Created):** The Queue Object.
**Possible Errors:**
- `404 Not Found` (Project ID invalid)

### Pause Queue
**Method:** `POST`
**Route:** `/api/v1/queues/:id/pause`
**Description:** Halts worker ingestion from this queue. Existing running jobs will complete.
**Authentication:** Required (JWT)
**Response (200 OK):** `{ "status": "success" }`

---

## 4. Job Orchestration

### Enqueue Immediate Job
**Method:** `POST`
**Route:** `/api/v1/jobs/queue/:queueId`
**Description:** Submit work to be executed as soon as capacity is available.
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "name": "Send Welcome Email",
  "payload": { "userId": 123 },
  "type": "immediate",
  "priority": "MEDIUM"
}
```
**Response (201 Created):** The Job Object.

### Enqueue Delayed Job
**Method:** `POST`
**Route:** `/api/v1/jobs/queue/:queueId`
**Request Body Extension:**
```json
{
  "type": "delayed",
  "delayMs": 60000
}
```

### Enqueue Scheduled/Cron Job
**Method:** `POST`
**Route:** `/api/v1/jobs/queue/:queueId`
**Request Body Extension:**
```json
{
  "type": "recurring",
  "cronExpression": "*/15 * * * *"
}
```

### Cancel Job
**Method:** `POST`
**Route:** `/api/v1/jobs/:id/cancel`
**Description:** Mark a QUEUED or SCHEDULED job as CANCELLED.
**Authentication:** Required (JWT)
**Response (200 OK):** The updated Job Object.
**Possible Errors:**
- `400 Bad Request` (Cannot cancel a RUNNING job)

---

## 5. Batch Engine

### Enqueue Batch
**Method:** `POST`
**Route:** `/api/v1/jobs/queue/:queueId/batch`
**Description:** Enqueue up to 10,000 jobs atomically.
**Authentication:** Required (JWT)
**Request Body:**
```json
{
  "name": "Nightly Sync",
  "jobs": [
    { "name": "Sync User 1", "payload": { "id": 1 } },
    { "name": "Sync User 2", "payload": { "id": 2 } }
  ]
}
```
**Response (201 Created):** The Batch Object containing `totalJobs`.

---

## 6. Observability

### Get System Events
**Method:** `GET`
**Route:** `/api/v1/events`
**Description:** Paginated operational audit trail (Logins, Pause, Restarts).
**Authentication:** Required (JWT)
**Response (200 OK):**
```json
{
  "data": [
    { "eventType": "QUEUE_PAUSED", "severity": "WARN" }
  ],
  "meta": { "total": 1, "page": 1 }
}
```

### Dead Letter Operations
**Method:** `POST`
**Route:** `/api/v1/jobs/:id/retry`
**Description:** Manually transition a DEAD_LETTERED job back to QUEUED. Deletes the DLQ record.
**Authentication:** Required (JWT)
**Response (200 OK):** The restored Job Object.
