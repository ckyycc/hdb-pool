'use strict';

const RequestState = require('./types/RequestState');
const EventType = require('./types/EventType');
const Utils = require('./Utils');

let requestId = 0;

/**
 * @class
 * @private
 */
class Request {
  /**
   * Constructor of Request
   * @param {number} timeout
   */
  constructor(timeout) {
    /**
     * Request state
     * @type {RequestState}
     * @private
     */
    this._state = RequestState.PENDING;
    /**
     * Request id
     * @type {number}
     * @private
     */
    this._id = requestId++;

    /**
     * Creation time. Use it for the calculation of timeout
     * @type {number}
     * @private
     */
    this._creationTime = Date.now();
    /**
     * ID value of the timer that is set. Use it with the clearTimeout() method to cancel the timer
     * @type {Number}
     * @private
     */
    this._timeout = null;

    /**
     * The resolve for promise of the request
     * @private
     */
    this._resolve = undefined;

    /**
     * The reject for promise of the request
     * @private
     */
    this._reject = undefined;

    /**
     * The promise of the request
     * @type {Promise}
     * @private
     */
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    if (timeout != null) {
      this._setTimeout(timeout);
    }
  }

  /**
   * set timeout
   * @param {number} delay the delay of timeout (milliseconds)
   * @private
   */
  _setTimeout(delay) {
    if (this._state !== RequestState.PENDING) {
      return;
    }
    const ttl = parseInt(delay, 10);

    if (isNaN(ttl) || ttl <= 0) {
      this.reject(new Error('delay must be a positive int'));
    }

    const age = Date.now() - this._creationTime;

    if (this._timeout) {
      this._removeTimeout();
    }
    this._timeout = setTimeout(() => this._fireTimeout(), Math.max(ttl - age, 0));
  }

  /**
   * remove timeout
   * @private
   */
  _removeTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    this._timeout = null;
  }

  /**
   * Fire timeout, reject the promise
   * @private
   */
  _fireTimeout() {
    Utils.emitMessage(EventType.REQUEST_TIMEOUT,
      `Request timeout. Request info: (id: ${this._id}, creation time: ${this._creationTime})`);
    this.reject(new Error(
      `Request timeout. Request info: (id: ${this._id}, creation time: ${this._creationTime})`));
  }

  /**
   * Reject the promise
   * @param {any} reason the reject reason
   */
  reject(reason) {
    this._removeTimeout();
    if (this._state !== RequestState.PENDING) {
      return;
    }
    this._state = RequestState.REJECTED;
    this._reject(reason);
  }

  /**
   * Resolve the promise with the value
   * @param {any} value the value that will be resolved for the promise
   */
  resolve(value) {
    this._removeTimeout();
    if (this._state !== RequestState.PENDING) {
      return;
    }
    this._state = RequestState.FULFILLED;
    this._resolve(value);
  }

  /**
   * Get state of the request
   * @return {RequestState}
   */
  get state() {
    return this._state;
  }

  /**
   * Get promise of the request
   * @return {Promise}
   */
  get promise() {
    return this._promise;
  }

  /**
   * Get id of the request
   * @return {number}
   */
  get id() {
    return this._id;
  }
}

module.exports = Request;
