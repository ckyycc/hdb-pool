'use strict';

const ResourceState = require('./types/ResourceState');
let resourceId = 0;

/**
 * @class
 * @private
 */
class Resource {
  /**
   * constructor for resource
   * @param {*} conn
   */
  constructor(conn) {
    /**
     * last allocate time
     * @type {Date}
     * @private
     */
    this._lastAllocateTime = null;

    /**
     * last idle time
     * @type {Date}
     * @private
     */
    this._lastIdleTime = null;

    /**
     * the database connection
     * @private
     */
    this._connection = conn;

    /**
     * id of the resource
     * @type {number}
     * @private
     */
    this._id = resourceId++;

    // set state to idle
    this.idle();
  }

  /**
   * database connection
   */
  get connection() {
    return this._connection;
  }

  /**
   * state of the resource
   * @return {ResourceState}
   */
  get state() {
    return this._state;
  }

  /**
   * id of the resource
   * @return {number}
   */
  get id() {
    return this._id;
  }

  /**
   * last idle time
   * @return {Date}
   */
  get lastIdleTime() {
    return this._lastIdleTime;
  }

  /**
   * last allocate time
   * @return {Date}
   */
  get lastAllocateTime() {
    return this._lastAllocateTime;
  }

  /**
   * set the state of the resource to "allocated" and return the resource
   * @return {Resource}
   */
  allocate() {
    this._lastAllocateTime = Date.now();
    this._state = ResourceState.ALLOCATED;
    return this;
  }

  /**
   * set the state of the resource to "idle" and return the resource
   * @return {Resource}
   */
  idle() {
    if (this._state !== ResourceState.IDLE) {
      // only reset when status is not IDLE
      this._lastIdleTime = Date.now();
      this._state = ResourceState.IDLE;
    }
    return this;
  }

  /**
   * set the state of the resource to "invalid" and return the resource
   * @return {Resource}
   */
  invalid() {
    this._state = ResourceState.INVALID;
    return this;
  }
}

module.exports = Resource;
