import "dotenv/config";

import { HeartbeatService } from "./heartbeat";
import { JobExecutor } from "./executors";
import { QueuePoller } from "./queue";
import { MonitorService } from "./monitor";
import { WorkerLogger, createWorkerRuntime } from "./utils";

const logger = new WorkerLogger();
const runtime = createWorkerRuntime({
	logger,
	queuePoller: new QueuePoller(),
	executor: new JobExecutor(),
	heartbeat: new HeartbeatService(),
	monitor: new MonitorService(),
});

runtime.start();
