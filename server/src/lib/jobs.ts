import cron from "node-cron";
import { COL } from "@reservation/shared";
import type { Job } from "./callable";
import { logger } from "./logger";
import { getDb } from "./mongo";

/**
 * Claims one run of a job. Several server instances may be running, each with the same schedule:
 * the first one to write the run's document wins and the others skip it.
 */
async function claimRun(name: string, slot: string): Promise<boolean> {
  const runs = (await getDb()).collection<{ _id: string; startedAt: Date }>(COL.jobRuns);
  try {
    await runs.insertOne({ _id: `${name}:${slot}`, startedAt: new Date() });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

/** Runs a job now, for the minute it starts in. Never throws: a failed job is logged and tried again at its next slot. */
export async function runJob(job: Job, now = new Date()): Promise<void> {
  const slot = now.toISOString().slice(0, 16);
  try {
    if (!(await claimRun(job.name, slot))) return;
    await job.run();
  } catch (err) {
    logger.error("Job failed", { job: job.name, err });
  }
}

/** Starts the schedule of every job. Returns a function that stops them. */
export function startJobs(jobs: Job[]): () => void {
  const tasks = jobs.map((job) =>
    cron.schedule(job.schedule, () => void runJob(job), { name: job.name, timezone: job.timeZone }),
  );
  logger.info("Jobs scheduled", { jobs: jobs.map((job) => `${job.name} (${job.schedule})`) });
  return () => tasks.forEach((task) => void task.stop());
}
