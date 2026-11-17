const { detectRedisMode } = require('../../config/redis');
const MemoryQueueDriver = require('./memory.driver');
const BullMQQueueDriver = require('./bullmq.driver');

let activeQueueDriver = null;
let initPromise = null;

/**
 * Initializes the appropriate queue driver depending on Redis availability
 */
async function initQueueService() {
  if (activeQueueDriver) {
    return activeQueueDriver;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const { mode } = await detectRedisMode();
    if (mode === 'redis') {
      activeQueueDriver = new BullMQQueueDriver();
    } else {
      activeQueueDriver = new MemoryQueueDriver();
    }
    return activeQueueDriver;
  })();

  return initPromise;
}

const queueService = {
  async addJob(name, data, opts) {
    const driver = await initQueueService();
    return driver.addJob(name, data, opts);
  },

  async getJob(id) {
    const driver = await initQueueService();
    return driver.getJob(id);
  },

  async getJobs(limit) {
    const driver = await initQueueService();
    return driver.getJobs(limit);
  },

  async startWorker() {
    const driver = await initQueueService();
    return driver.startWorker();
  },

  async close() {
    if (activeQueueDriver) {
      await activeQueueDriver.close();
      activeQueueDriver = null;
      initPromise = null;
    }
  },

  getDriver() {
    return activeQueueDriver;
  },

  setDriver(customDriver) {
    activeQueueDriver = customDriver;
  },
};

module.exports = queueService;
module.exports.initQueueService = initQueueService;
