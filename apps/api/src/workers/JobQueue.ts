import { logger } from '../shared/utils/logger';

export type Job<T = any> = {
  id: string;
  name: string;
  data: T;
};

export type JobHandler<T = any> = (job: Job<T>) => Promise<void>;

/**
 * Basic In-Memory Background Job Queue for executing heavy tasks 
 * (like image blurring, video encoding, or sending mass push notifications) 
 * without blocking the main Express thread.
 */
export class JobQueue {
  private handlers = new Map<string, JobHandler>();
  private queue: Job[] = [];
  private isProcessing = false;

  public register(name: string, handler: JobHandler) {
    this.handlers.set(name, handler);
    logger.info(`JobQueue: Handler registered for '${name}'`);
  }

  public async push<T>(name: string, data: T) {
    const job: Job<T> = { id: crypto.randomUUID(), name, data };
    this.queue.push(job);
    logger.debug(`JobQueue: Job pushed [${job.id}] - ${name}`);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      const handler = this.handlers.get(job.name);
      if (handler) {
        try {
          await handler(job);
          logger.info(`JobQueue: Job completed [${job.id}]`);
        } catch (error) {
          logger.error(`JobQueue: Job failed [${job.id}] - ${error}`);
          // Requeue logic or Dead Letter Queue can be added here
        }
      } else {
        logger.warn(`JobQueue: No handler found for job '${job.name}'`);
      }
    }

    this.isProcessing = false;
  }
}

export const backgroundQueue = new JobQueue();
