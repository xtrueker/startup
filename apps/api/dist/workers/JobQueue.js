"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundQueue = exports.JobQueue = void 0;
const logger_1 = require("../shared/utils/logger");
/**
 * Basic In-Memory Background Job Queue for executing heavy tasks
 * (like image blurring, video encoding, or sending mass push notifications)
 * without blocking the main Express thread.
 */
class JobQueue {
    constructor() {
        this.handlers = new Map();
        this.queue = [];
        this.isProcessing = false;
    }
    register(name, handler) {
        this.handlers.set(name, handler);
        logger_1.logger.info(`JobQueue: Handler registered for '${name}'`);
    }
    async push(name, data) {
        const job = { id: crypto.randomUUID(), name, data };
        this.queue.push(job);
        logger_1.logger.debug(`JobQueue: Job pushed [${job.id}] - ${name}`);
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }
    }
    async processQueue() {
        this.isProcessing = true;
        while (this.queue.length > 0) {
            const job = this.queue.shift();
            if (!job)
                continue;
            const handler = this.handlers.get(job.name);
            if (handler) {
                try {
                    await handler(job);
                    logger_1.logger.info(`JobQueue: Job completed [${job.id}]`);
                }
                catch (error) {
                    logger_1.logger.error(`JobQueue: Job failed [${job.id}] - ${error}`);
                    // Requeue logic or Dead Letter Queue can be added here
                }
            }
            else {
                logger_1.logger.warn(`JobQueue: No handler found for job '${job.name}'`);
            }
        }
        this.isProcessing = false;
    }
}
exports.JobQueue = JobQueue;
exports.backgroundQueue = new JobQueue();
//# sourceMappingURL=JobQueue.js.map