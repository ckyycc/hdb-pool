'use strict';
const Pool = require('./Pool');
const Request = require('./Request');
const Util = require('./Utils');
const EventType = require('./types/EventType');
const RequestState = require('./types/RequestState');

/**
 * @class
 * @public
 */
class PoolManager {
  /**
   * Constructor of PoolManager
   * @param {*} params parameters of HANA connection
   * @param {*} opts options of Pool
   */
  constructor(params, opts = null) {
    /**
     * Connection pool
     * @type {Pool}
     * @private
     */
    this._pool = new Pool(params, opts);
  }

  /**
   * Request a new resource.
   * @return {Promise}
   */
  getConnection() {
    const resourceRequest = new Request(this._pool.options.requestTimeout);

    if (this._pool.isPoolInitialized()) {
      this._pool.addRequestToRequestList(resourceRequest)
        .catch((err) => Util.emitMessage(EventType.ERROR, `getConnect error: ${err}`));
    } else {
      this._pool.initialize()
        .then(() => this._pool.addRequestToRequestList(resourceRequest))
        .catch((err) => Util.emitMessage(EventType.ERROR, `getConnect error: ${err}`));
    }
    return resourceRequest.promise;
  }

  /**
   * Return the resource back to pool.
   * @param {any} conn HANA connection
   * @return {Promise}
   */
  release(conn) {
    return this._pool.returnConnection(conn);
  }

  /**
   * Request the resource to be destroyed.
   * @param {any} conn HANA connection
   * @return {Promise}
   */
  destroy(conn) {
    return this._pool.destroyConnection(conn);
  }

  /**
   * Request to clear the pool.
   * @return {Promise}
   */
  clear() {
    return this._pool.clear();
  }

  /**
   * Get the overview of current status of the pool
   * @return {{pool: *, request: *}}
   */
  getPoolStatusOverview() {
    return {
      pool: {
        size: this._pool.poolSize,
        min: this._pool.options.min,
        max: this._pool.options.max,
        available: this._pool.availableResourceNum,
        timeout: Util.resourceTimeoutNum
      },
      request: {
        number: this._pool.requestList.length,
        pending: this._pool.requestList.filter(r => r.state === RequestState.PENDING).length,
        max: this._pool.options.maxWaitingRequests,
        resolved: Util.resolvedRequestNum,
        rejected: Util.rejectedRequestNum,
        timeout: Util.requestTimeoutNum
      }
    };
  }

  /**
   * event Emitter
   * @return {events.EventEmitter}
   */
  static get eventEmitter() {
    return Util.eventEmitter;
  }
}

exports = module.exports = PoolManager;
