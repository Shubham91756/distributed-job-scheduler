import "dotenv/config";

export const config = {
    POLLING_INTERVAL_MS: parseInt(process.env.POLLING_INTERVAL_MS || "3000"),
    MAX_POLLING_INTERVAL_MS: parseInt(process.env.MAX_POLLING_INTERVAL_MS || "20000"),
    HEARTBEAT_INTERVAL_MS: parseInt(process.env.HEARTBEAT_INTERVAL_MS || "10000"),
    LEASE_DURATION_MINUTES: parseInt(process.env.LEASE_DURATION_MINUTES || "5"),
    RECOVERY_INTERVAL_MS: parseInt(process.env.RECOVERY_INTERVAL_MS || "15000"),
    HEARTBEAT_TIMEOUT_MS: parseInt(process.env.HEARTBEAT_TIMEOUT_MS || "30000"),
    MAX_EXECUTION_TIME_S: parseInt(process.env.MAX_EXECUTION_TIME_S || "300"),
    WORKER_CAPACITY: parseInt(process.env.WORKER_CAPACITY || "5"),
};
