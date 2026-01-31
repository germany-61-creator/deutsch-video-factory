class JobManager {
  constructor(logger) {
    this.logger = logger;
    this.active = null; // { id, cancelRequested }
  }

  isBusy() {
    return !!this.active;
  }

  startJob(name) {
    if (this.active) throw new Error('A render job is already running');
    const job = { id: `${Date.now()}`, name, cancelRequested: false };
    this.active = job;
    this.logger.info('JOB_START', { id: job.id, name: job.name });
    return job;
  }

  requestCancel() {
    if (!this.active) return false;
    this.active.cancelRequested = true;
    this.logger.warn('JOB_CANCEL_REQUESTED', { id: this.active.id });
    return true;
  }

  finishJob(ok, extra) {
    if (!this.active) return;
    this.logger.info('JOB_FINISH', { id: this.active.id, ok, ...extra });
    this.active = null;
  }
}

module.exports = { JobManager };
