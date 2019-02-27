'use strict';
const events = require('events');
const eventEmitter = new events.EventEmitter();
const EventType = require('./types/EventType');

let requestTimeoutNum = 0;
let resourceTimeoutNum = 0;
let resolvedRequestNum = 0;
let rejectedRequestNum = 0;

const DEFAULT_POOL_OPTIONS = {
  min: 3,
  max: 50,
  requestTimeout: 5000,
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
    poolOptions.requestTimeout = Number(poolOptions.requestTimeout);

    poolOptions.max = isNaN(poolOptions.max) ? 1 : poolOptions.max >= 1 ? poolOptions.max : 1;
    poolOptions.min = isNaN(poolOptions.min) ? 0 : poolOptions.min > poolOptions.max ? poolOptions.max : poolOptions.min;
    poolOptions.requestTimeout = isNaN(poolOptions.requestTimeout) ? 0 : poolOptions.requestTimeout;

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
   * get the connection parameters for HANA createConnection
   * @param {any} params the provided parameters from pool
   * @return {{UID: *, PORT: *, HOST: *, PWD: *}}
   */
  static getPoolParams(params) {
    return {
      HOST: params.hostName,
      PORT: params.port,
      UID: params.userName,
      PWD: params.password
    };
  }

  /**
   * emit event
   * @param {string} event event name
   * @param {string} message event message
   * @param {boolean} debug debug flag
   */
  static emitMessage(event, message, debug = false) {
    if (!debug && event === EventType.DEBUG) {
      // skip all debug message in none-debug mode
      return;
    }
    eventEmitter.emit(event, message);
  }

  /**
   * get event emitter
   * @return {events.EventEmitter}
   */
  static get eventEmitter() {
    return eventEmitter;
  }

  /**
   * Total number of timeout resource
   * @returns {number}
   */
  static get resourceTimeoutNum() {
    return resourceTimeoutNum;
  }

  /**
   * Timeout resource number + 1
   */
  static increaseResourceTimeoutNum() {
    resourceTimeoutNum++;
  }

  /**
   * Total number of timeout request
   * @returns {number}
   */
  static get requestTimeoutNum() {
    return requestTimeoutNum;
  }

  /**
   * Timeout request number + 1
   */
  static increaseRequestTimeoutNum() {
    requestTimeoutNum++;
  }

  /**
   * Total number of resolved request
   * @returns {number}
   */
  static get resolvedRequestNum() {
    return resolvedRequestNum;
  }

  /**
   * Resolved request number + 1
   */
  static increaseResolvedRequestNum() {
    resolvedRequestNum++;
  }

  /**
   * Total number of rejected request number
   * @returns {number}
   */
  static get rejectedRequestNum() {
    return rejectedRequestNum;
  }

  /**
   * Rejected Request number + 1
   */
  static increaseRejectedRequestNum() {
    rejectedRequestNum++;
  }
}

exports = module.exports = Utils;
