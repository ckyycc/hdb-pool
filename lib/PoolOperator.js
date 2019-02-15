'use strict';
const Operator = require('./Operator');
const TaskType = require('./types/TaskType');
const ResourceState = require('./types/ResourceState');
const EventType = require('./types/EventType');
const Util = require('./Utils');

/**
 * @class
 * @private
 */
class PoolOperator extends Operator {
  /**
   * Constructor of Pool
   * @param {Pool} pool
   */
  constructor(pool) {
    super(pool);
    // make sure we have minimum resources
    this._ensureMinPoolResources().catch((err) => {
      Util.emitMessage(EventType.ERROR, `ensureMinPoolResources error: ${err}`);
      // decided not to throw it out to terminate Node.js process.
      // throw err;
    });
  }

  /**
   * Tasks dispatcher, override from parent
   * @param {Task} task task for operators
   * @return {Promise}
   */
  work(task) {
    switch (task.taskType) {
      case TaskType.DELIVERY_NEW_CONNECTION:
        return this.deliverPooledConnection(task.resource);
      case TaskType.RETURN_CONNECTION:
        return this._returnConnectionToPool(task.resource);
      case TaskType.CHECK_IDLE_TIMEOUT:
        return this._checkIdleTimeout();
      case TaskType.DESTROY_CONNECTION:
        return this._destroyConnection(task.resource);
      case TaskType.CLEAN_POOL:
        return this._cleanPoolResources();
      default:
        return null;
    }
  }

  /**
   * Make sure there are minimum resources in the pool
   * @return {Promise}
   * @private
   */
  _ensureMinPoolResources() {
    const promises = [];
    for (let i = 0, num = this.pool.options.min - this.pool.poolSize; i < num; ++i) {
      promises.push(this.createPoolResource());
    }

    return Promise.all(promises);
  }

  /**
   * Return the connection back to pool
   * @param {any} conn HANA connection
   * @return {Promise}
   * @private
   */
  _returnConnectionToPool(conn) {
    const resource = this.pool.getResourceFromConnectionInAll(conn);
    if (resource) {
      return this.pool.addResourceToAvailable(resource);
    } else {
      return Promise.reject(new Error('Connection is not part of this pool'));
    }
  }

  /**
   * Destroy connection
   * @param {any} conn HANA connection
   * @return {Promise}
   * @private
   */
  _destroyConnection(conn) {
    const resource = this.pool.getResourceFromConnectionInAll(conn);
    return resource ? this.destroy(resource).then(() => this._ensureMinPoolResources()) : Promise.resolve();
  }

  /**
   * Check Timeout for idle connection
   * @return {Promise}
   * @private
   */
  _checkIdleTimeout() {
    const availableNum = this.pool.availableResourceNum;
    const promises = [];
    for (let i = availableNum - 1; i >= 0; --i) {
      const resource = this.pool.getAvailableResource(i);
      if (resource.state === ResourceState.IDLE) {
        const idleTime = Date.now() - resource.lastIdleTime;
        if (this.pool.options.idleTimeout < idleTime) {
          Util.emitMessage(EventType.DEBUG, `Timeout..., removing it, id is: ${resource.id}`);
          promises.push(this.destroy(resource));
        }
      }
    }
    Util.emitMessage(EventType.DEBUG, `IDLE timeout checking done, ensuring minimum resources in the pool`);
    return Promise.all(promises)
      .then(() => availableNum > this.pool.availableResourceNum ? this._ensureMinPoolResources() : Promise.resolve());
  }

  /**
   * clean(remove and destroy) all items from the pool.
   * @private
   */
  _cleanPoolResources() {
    const destroyPromises = this.pool.poolResources.map(resource => this.destroy(resource));
    const removeRequestList = this.pool.requestList.map(request => this.pool.removeRequestFromList(request));
    return Promise.all([destroyPromises, removeRequestList]);
  }
}

exports = module.exports = PoolOperator;
