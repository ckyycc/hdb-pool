'use strict';

const Operator = require('./Operator');
const TaskType = require('./types/TaskType');
const EventType = require('./types/EventType');
const Util = require('./Utils');

/**
 * @class
 * @private
 */
class RequestOperator extends Operator {
  /**
   * Tasks dispatcher, override from parent
   * @param {Task} task task for operators
   * @return {Promise}
   */
  work(task) {
    Util.emitMessage(EventType.DEBUG, `Trying to dispatch pooled connections, task type: ${task.taskType}`, this.pool.options.debug);
    switch (task.taskType) {
      case TaskType.AVAILABLE_CONNECTION_CHANGED:
        return this._dispatchPooledConnections();
      case TaskType.REQUEST_CONNECTION:
        return this._handleNewRequest(task.resource);
      default:
        return null;
    }
  }

  /**
   * handle the new request
   * @param {Request} request
   * @return {Promise}
   * @private
   */
  _handleNewRequest(request) {
    return Promise.resolve().then(() => {
      if (request) {
        // remove timeout request
        this.pool.removeNonPendingRequest();
        if (this.pool.options.maxWaitingRequests > 0 && this.pool.requestList.length > this.pool.options.maxWaitingRequests) {
          Util.emitMessage(EventType.DEBUG, `Max waiting requests count exceeded, removing the request from the list, ` +
            `request list size is ${this.pool.requestList.length}`, this.pool.options.debug);
          this.pool.removeRequestFromList(request);
          Util.emitMessage(EventType.DEBUG, `Request list size is ${this.pool.requestList.length}`, this.pool.options.debug);
          request.reject(new Error('Max waiting requests count exceeded'));
          Util.increaseRejectedRequestNum();
        } else {
          return this._dispatchPooledConnections();
        }
      }
      return Promise.resolve();
    });
  }

  /**
   * Dispatch the pooled connection
   * @return {Promise}
   * @private
   */
  _dispatchPooledConnections() {
    let waitingNum = this.pool.requestList.length;
    Util.emitMessage(EventType.DEBUG, `Dispatching pooled connections, waiting requests number is ${waitingNum}`, this.pool.options.debug);

    if ((waitingNum < 1) || (this.pool.availableResourceNum < 1 && this.pool.room < 1)) {
      Util.emitMessage(EventType.DEBUG, `waiting number < 1 or pool empty and no room left.`, this.pool.options.debug);
      return Promise.resolve();
    }

    // placeholder num means poll is trying to dispatch those resources
    let resourcesNumToCreate = waitingNum - this.pool.availableResourceNum - this.pool.placeholderNum;
    // total number should not bigger than the room
    resourcesNumToCreate = resourcesNumToCreate > this.pool.room ? this.pool.room : resourcesNumToCreate;

    const promises4Creation = [];
    Util.emitMessage(EventType.DEBUG, `Resource number to create: ${resourcesNumToCreate},` +
      `available resource number: ${this.pool.availableResourceNum}, waiting request number: ${waitingNum}, ` +
      `placeholder number: ${this.pool.placeholderNum}`, this.pool.options.debug);
    // promises for resource creation (and delivery)
    for (let i = 0; i < resourcesNumToCreate; ++i) {
      promises4Creation.push(this.createPoolResource());
    }

    return Promise.all(promises4Creation).then(() => {
      // delivery with the available resource list
      waitingNum = this.pool.requestList.length;
      const resourcesNumToDelivery = waitingNum < this.pool.availableResourceNum ? waitingNum : this.pool.availableResourceNum;
      const promise4Delivery = [];
      // collect all promises for delivery
      for (let i = 0; i < resourcesNumToDelivery; ++i) {
        const connection = this.pool.dequeueFromAvailableResources();
        if (connection) {
          promise4Delivery.push(this.deliverPooledConnection(connection));
        }
      }
      return Promise.all(promise4Delivery);
    });
  }
}

exports = module.exports = RequestOperator;
