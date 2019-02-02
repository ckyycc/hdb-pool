'use strict';
const events = require('events');
const eventEmitter = new events.EventEmitter();

const DEFAULT_POOL_OPTIONS = {
  min: 3,
  max: 50,
  acquireTimeout: 5000,
  maxWaitingRequests: 0,
  checkInterval: 0,
  idleTimeout: 30000,
  debug: false
};

/**
 * @class
 * @private
 */
class Utils {
  /**
   * get the options for pool via the provided options
   * @param {any} options options of Pool
   * @return {any}
   */
  static getPoolOptions(options) {
    const poolOptions = Object.assign({}, DEFAULT_POOL_OPTIONS, options);
    poolOptions.max = Number(poolOptions.max);
    poolOptions.min = Number(poolOptions.min);
    poolOptions.acquireTimeout = Number(poolOptions.acquireTimeout);

    poolOptions.max = isNaN(poolOptions.max) ? 1 : poolOptions.max >= 1 ? poolOptions.max : 1;
    poolOptions.min = isNaN(poolOptions.min) ? 0 : poolOptions.min > poolOptions.max ? poolOptions.max : poolOptions.min;
    poolOptions.acquireTimeout = isNaN(poolOptions.acquireTimeout) ? 0 : poolOptions.acquireTimeout;

    poolOptions.maxWaitingRequests = Number(poolOptions.maxWaitingRequests);
    poolOptions.maxWaitingRequests = isNaN(poolOptions.maxWaitingRequests) ? 0 : poolOptions.maxWaitingRequests;

    poolOptions.checkInterval = Number(poolOptions.checkInterval);
    poolOptions.checkInterval = isNaN(poolOptions.checkInterval) ? 0 : poolOptions.checkInterval;

    poolOptions.idleTimeout = Number(poolOptions.idleTimeout);
    poolOptions.idleTimeout = isNaN(poolOptions.idleTimeout) ? 0 : poolOptions.idleTimeout;

    poolOptions.debug = typeof poolOptions.debug === 'boolean' ? poolOptions.debug : String(poolOptions.debug).toLowerCase() === 'true';

    return poolOptions;
  }

  /**
   * emit event
   * @param {string} event event name
   * @param {string} message event message
   */
  static emitMessage(event, message) {
    eventEmitter.emit(event, message);
  }

  /**
   * get event emitter
   * @return {events.EventEmitter}
   */
  static get eventEmitter() {
    return eventEmitter;
  }
}

exports = module.exports = Utils;
