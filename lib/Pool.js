'use strict';

const PoolOperator = require('./PoolOperator');
const RequestOperator = require('./RequestOperator');
const Utils = require('./Utils');
const Task = require('./Task');
const TaskType = require('./types/TaskType');
const RequestState = require('./types/RequestState');
const EventType = require('./types/EventType');

/**
 * @class
 * @private
 */
class Pool {
  /**
   * Constructor of Pool
   * @param {*} params parameters of HANA connection
   * @param {*} opts options of the pool
   */
  constructor(params, opts = null) {
    /**
     * Parameters of connection
     * @private
     */
    this._parameters = params;
    /**
     * Options for the pool
     * @private
     */
    this._options = Utils.getPoolOptions(opts);
    /**
     * Available resources of the pool
     * @type {Array}
     * @private
     */
    this._availableResources = [];
    /**
     * All resources of the pool
     * @type {Array}
     * @private
     */
    this._allResources = [];
    /**
     * Holds waiting requests
     * @type {Array}
     * @private
     */
    this._requestList = [];
    /**
     * Observer
     * @type {Operator[]}
     * @private
     */
    this._operators = [new PoolOperator(this), new RequestOperator(this)];

    /**
     * Interval Id
     * @type {number}
     * @private
     */
    this._intervalId = undefined;

    /**
     * Initialization flag
     * @type {boolean}
     * @private
     */
    this._initializeFlag = false;
  }

  /**
   * Connection parameters
   */
  get parameters() {
    return this._parameters;
  }

  /**
   * Pool options
   */
  get options() {
    return this._options;
  }

  /**
   * request list
   * @return {Array}
   */
  get requestList() {
    return this._requestList;
  }

  /**
   * Pool size
   * @return {number}
   */
  get poolSize() {
    return this._allResources.length;
  }

  /**
   * Available resource number
   * @return {number}
   */
  get availableResourceNum() {
    return this._availableResources.length;
  }

  /**
   * Room left of the pool
   * @return {number}
   */
  get room() {
    return this._options.max - this._allResources.length;
  }

  /**
   * Placeholder number
   * @return {number}
   */
  get placeholderNum() {
    let num = 0;
    this._allResources.forEach((conn) => {
      if (typeof conn === 'symbol') {
        ++num;
      }
    });

    return num;
  }

  /**
   * Get all resources from the pool
   * @returns {Array}
   */
  get poolResources() {
    return this._allResources;
  }

  /**
   * Get available resource list from the pool
   * @returns {Array}
   */
  get availableResourceList() {
    return this._availableResources;
  }

  /**
   * Get available resource by the index
   * @param {number} index index of the resource
   * @return {Resource}
   */
  getAvailableResource(index) {
    return this._availableResources[index];
  }

  /**
   * Dequeue from available resources
   * @return {connection}
   */
  dequeueFromAvailableResources() {
    return this._availableResources.shift();
  }

  /**
   * Dequeue from request list
   * @return {Request}
   */
  dequeueFromRequestList() {
    return this._requestList.shift();
  }

  /**
   * Remove resource from the pool
   * @param {Resource} resource pooled resource
   */
  removeResourceFromAll(resource) {
    const index = this._allResources.indexOf(resource);
    if (index > -1) {
      this._allResources.splice(index, 1);
    }
  }

  /**
   * Get pool resource via the HANA connection from pool
   * @param {any} conn HANA connection
   * @return {Resource}
   */
  getResourceFromConnectionInAll(conn) {
    for (const resource of this._allResources) {
      if (resource && resource.connection === conn) {
        return resource;
      }
    }
    return null;
  }

  /**
   * Remove resource from available list of the pool
   * @param {Resource} resource the pool resource
   */
  removeResourceFromAvailable(resource) {
    const index = this._availableResources.indexOf(resource);
    if (index > -1) {
      this._availableResources.splice(index, 1);

      if (this._availableResources.length === 0 && this._intervalId !== undefined) {
        this._stopCheckInterval();
      }
    }
  }

  /**
   * Remove request from request list
   * @param {Request} request the pool resource
   */
  removeRequestFromList(request) {
    const index = this.requestList.indexOf(request);
    if (index > -1) {
      this.requestList.splice(index, 1);
    }
  }

  /**
   * Remove all requests with Non-PENDING state from request list
   */
  removeNonPendingRequest() {
    const invalidRequestList = this.requestList.filter((request) => request.state !== RequestState.PENDING);
    invalidRequestList.forEach((request) => this.removeRequestFromList(request));
  }

  /**
   * Add request to request list
   * @param {Request} request request for the HANA connection from pool
   * @return {Promise}
   */
  addRequestToRequestList(request) {
    this._requestList.push(request);
    // notify all observers
    return this._notifyAllOperators(new Task(TaskType.REQUEST_CONNECTION, request));
  }

  /**
   * Add resource to the pool
   * @param {Resource} resource pool resource (HANA connection)
   * @return {Promise}
   */
  addResourceToAll(resource) {
    this._allResources.push(resource);
    // not triggering the observers if it is placeholder
    return resource && typeof resource !== 'symbol'
      ? this._notifyAllOperators(new Task(TaskType.DELIVERY_NEW_CONNECTION, resource)) : Promise.resolve();
  }

  /**
   * Add resource to the available list of the pool
   * @param {Resource} resource pool resource (HANA connection)
   * @return {Promise}
   */
  addResourceToAvailable(resource) {
    this._availableResources.push(resource.idle());
    if (this._options && this._options.checkInterval > 0 && this._intervalId === undefined) {
      this._checkConnectionIdleTimeout(this._options.checkInterval);
    } else if (this._options && this._options.checkInterval <= 0 && this._intervalId !== undefined) {
      this._stopCheckInterval();
    }
    Utils.emitMessage(EventType.DEBUG,
      `Available connection list changed, now the available connection number is: ${this.availableResourceNum}.`,
      this._options.debug);
    return this._notifyAllOperators(new Task(TaskType.AVAILABLE_CONNECTION_CHANGED));
  }

  /**
   * Replace placeholder with the connection resource from the pool
   * @param {Symbol} placeHolder placeHolder of the resource
   * @param {Resource} resource resource of the HANA connection
   * @return {Promise}
   */
  replacePlaceHolderWithConnectionFromAll(placeHolder, resource) {
    const index = this._allResources.indexOf(placeHolder);
    if (index > -1) {
      // the queue changed due to the new connection, need to notify the observers.
      if (resource && typeof resource !== 'symbol') {
        this._allResources[index] = resource;
        return this._notifyAllOperators(new Task(TaskType.DELIVERY_NEW_CONNECTION, resource));
      }
    }

    return Promise.reject(new Error('Internal error, can not find the placeholder.'));
  }

  /**
   * Return connection back to pool
   * @param {*} conn HANA connection
   * @return {Promise}
   */
  returnConnection(conn) {
    if (conn) {
      return this._notifyAllOperators(new Task(TaskType.RETURN_CONNECTION, conn));
    }
    return Promise.reject(new Error('Resource returning failed, the returned resource is empty.'));
  }

  /**
   * Destroy HANA connection
   * @param {*} conn HANA connection
   * @return {Promise}
   */
  destroyConnection(conn) {
    if (conn) {
      return this._notifyAllOperators(new Task(TaskType.DESTROY_CONNECTION, conn));
    }
    return Promise.resolve();
  }

  /**
   * Empty the pool
   * @return {Promise}
   */
  clear() {
    // stop checking first
    if (this._intervalId !== undefined) {
      this._stopCheckInterval();
    }

    return this._notifyAllOperators(new Task(TaskType.CLEAN_POOL));
  }

  /**
   * Initialize the pool
   */
  initialize() {
    if (!this.isPoolInitialized()) {
      return this._notifyAllOperators(new Task(TaskType.INITIALIZE_POOL)).then(() => {
        this._initializeFlag = true;
      });
    } else {
      return Promise.reject(new Error('Pool has already been initialized, tried to initialize twice.'));
    }
  }

  /**
   * Check if the pool has already been initialized
   * @returns {boolean}
   */
  isPoolInitialized() {
    return this._initializeFlag;
  }

  /**
   * Pooled connection idle timeout check and save the interval id to local variable
   * @param {number} time checkInterval
   * @private
   */
  _checkConnectionIdleTimeout(time) {
    this._intervalId = setInterval(() => this._notifyAllOperators(new Task(TaskType.CHECK_IDLE_TIMEOUT)).catch((err) => {
      Utils.emitMessage(EventType.ERROR, err);
    }), time);
  }

  /**
   * Stop the checking interval
   * @private
   */
  _stopCheckInterval() {
    if (this._intervalId !== undefined) {
      clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
  }

  /**
   * Notify observers for all the tasks
   * @param {Task} task task for observers
   * @return {Promise}
   * @private
   */
  _notifyAllOperators(task) {
    for (const operator of this._operators) {
      const workResult = operator.work(task);
      if (workResult != null) {
        return workResult;
      }
    }
    return Promise.reject(
      new Error(`Something wrong, can not find any worker for task ${task && task.taskType ? task.taskType : 'None'}`));
  }
}

exports = module.exports = Pool;
