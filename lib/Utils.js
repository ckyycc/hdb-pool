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
 * Sets client session information which is a list of session variables defined
 * as key-value pairs (case sensitive). Invalid session variables are ignored.
 *
 * @param {object} sessionInfo Client session info object
 * @returns An object with constructed session variables, or an empty object
 *
 * @remark
 * This applies to SAP HANA Client only.
 * It's important to set session variables when establishing a connection.
 *
 * @see List of predefined session variables
 * {@link https://help.sap.com/viewer/4fe29514fd584807ac9f2a04f6754767/2.0.03/en-US/20fd82b675191014b22c8af08d0b319c.html}
 * @see SAP HANA Client Interface Programming Reference
 * {@link https://help.sap.com/viewer/1efad1691c1f496b8b580064a6536c2d/Cloud/en-US/4fe9978ebac44f35b9369ef5a4a26f4c.html}
 */
const setSessionVariables = (sessionInfo) => {
  const sessionVariables = {};

  if (Object.prototype.toString.call(sessionInfo) !== '[object Object]') {
    // log only
    Utils.emitMessage(EventType.CONNECTION_CREATE_ERROR,
      'Client session info will be ignored. It must be a valid key-value pair ' +
      'object, e.g. { "application": "myApplication" }');
  } else {
    // compose each key with "sessionVariable" which is then the property key
    // of the session variable, e.g. "sessionVariable:APPLCIATION"
    for (const [k, v] of Object.entries(sessionInfo)) {
      // key is case sensitive
      sessionVariables[`sessionVariable:${k.toUpperCase()}`] = v;
    }
  }

  return sessionVariables;
};

/**
 * @class
 * @private
 */
class Utils {
  /**
   * get the options for pool via the provided options
   * @param {*} options options of Pool
   * @return {*}
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
   * @param {*} params the provided parameters from pool
   * @param {boolean} isHANAClient true means connection parameters are for HANA Client, false means node-hdb
   * @return {*}
   */
  static getPoolParams(params, isHANAClient = true) {
    if (params == null) {
      return {};
    }

    const hostName = params.hostName ? params.hostName : params.serverNode ? params.serverNode.split(":")[0] : undefined;
    const port = params.port ? params.port : params.serverNode ? params.serverNode.split(":")[1] : undefined;

    // include session variables for hana client if specified
    if (params.sessionVariables) {
      if (isHANAClient) {
        const sessionVariables = setSessionVariables(params.sessionVariables);
        // assign to the connection properties
        params = Object.assign(params, sessionVariables);
      }
      // exclude the original sessionVariables object from connection properties
      // no handling for node-hdb
      delete params.sessionVariables;
    }

    return isHANAClient ? {
      HOST: hostName,
      PORT: port,
      UID: params.userName,
      PWD: params.password,
      ...params
    } : {
      host: hostName,
      port: port,
      user: params.userName,
      password: params.password,
      ...params
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
   * get hana client from node-hdb or @sap/hana-client
   * @returns {db}
   */
  static getHanaClient() {
    let hana;
    try {
      hana = require('@sap/hana-client');
    } catch (e1) {
      try {
        hana = require('hdb');
        hana.fromNodeHDB = true;
      } catch (e2) {
        const error = new Error('Cannot find module either \'@sap/hana-client\' or \'hdb\'');
        error.code = 'MODULE_NOT_FOUND';
        throw error;
      }
    }
    return hana;
  }

  /**
   * check whether the driver is hana client or node-hdb
   * @param hana the hana driver
   * @returns {boolean}
   */
  static isHANAClient(hana) {
    if (hana == null) {
      throw new Error('HANA Client can not be empty');
    }
    return !hana.fromNodeHDB;
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
