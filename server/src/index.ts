import "./lib/env";
import { createApp } from "./app";
import * as exported from "./endpoints";
import type { Endpoint, Job } from "./lib/callable";
import { PORT } from "./lib/config";
import { startJobs } from "./lib/jobs";
import { logger } from "./lib/logger";

const endpoints = new Map<string, Endpoint>();
const jobs: Job[] = [];
for (const value of Object.values(exported)) {
  if (value.kind === "job") jobs.push(value);
  else if (endpoints.has(value.name)) throw new Error(`Two endpoints are named ${value.name}`);
  else endpoints.set(value.name, value);
}

const server = createApp(endpoints).listen(PORT(), () => {
  logger.info("Server started", { port: PORT(), endpoints: endpoints.size });
});
const stopJobs = process.env.DISABLE_JOBS === "true" ? () => undefined : startJobs(jobs);

// Hosts stop a container with SIGTERM: finish the requests in progress first.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    stopJobs();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
