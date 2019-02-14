'use strict';
const Pool = require('./Pool');
const Request = require('./Request');
const Util = require('./Utils');
const EventType = require('./types/EventType');

/**
 * @class
 * @public
 */
class PoolManager {
  /**
   * Constructor of PoolManager
   * @param {any} params parameters of HANA connection
   * @param {any} opts options of Pool
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
  getConnect() {
    const resourceRequest = new Request(this._pool.options.acquireTimeout);
    this._pool.addRequestToRequestList(resourceRequest).catch((err) => {
      Util.emitMessage(EventType.ERROR, `addRequestToRequestList error: ${err}`);
    });
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
   * event Emitter
   * @return {events.EventEmitter}
   */
  static get eventEmitter() {
    return Util.eventEmitter;
  }
}

exports = module.exports = PoolManager;
