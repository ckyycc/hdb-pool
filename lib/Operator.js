'use strict';

const Utils = require('./Utils');
const Resource = require('./Resource');
const Factory = require('./Factory');
const EventType = require('./types/EventType');
const RequestState = require('./types/RequestState');
const ResourceState = require('./types/ResourceState');

/**
 * @class
 * @private
 */
class Operator {
  /**
   * Constructor of Operator
   * @param {Pool} pool the pool
   */
  constructor(pool) {
    /**
     * Pool
     * @type {Pool}
     * @private
     */
    this._pool = pool;
  }

  /**
   * Connection Pool
   * @return {Pool}
   */
  get pool() {
    return this._pool;
  }

  /**
   * Create pool resource (HANA connection)
   * @return {Promise}
   */
  createPoolResource() {
    if (this._pool.room > 0) {
      // add some item (placeholder) to the pool during the creation
      const creationPlaceHolder = Symbol('PlaceHolder4Creation');
      return this._pool.addResourceToAll(creationPlaceHolder).then(() => {
        Utils.emitMessage(EventType.DEBUG,
          `Before resource creation, pool size is ${this._pool.poolSize}, placeholder number` +
          `is ${this._pool.placeholderNum}, available resource number is ${this._pool.availableResourceNum}`, this.pool.options.debug);
        return Factory.create(this._pool.parameters).then((conn) => {
          // //replace the placeholder with the connection
          return this._pool.replacePlaceHolderWithConnectionFromAll(creationPlaceHolder, new Resource(conn));
        }).catch((err) => {
          // remove the placeholder
          this._pool.removeResourceFromAll(creationPlaceHolder);
          Utils.emitMessage(EventType.CONNECTION_CREATE_ERROR, err);
          return Promise.reject(err);
        });
      });
    } else {
      Utils.emitMessage(EventType.DEBUG, `Pool is full, no room left.`, this.pool.options.debug);
      return Promise.resolve();
    }
  }

  /**
   * Remove the resource from the pool and destroy the resource
   * @param {Resource} resource the pool resource (HANA connection)
   * @return {Promise}
   */
  destroy(resource) {
    if (!resource) {
      Utils.emitMessage(EventType.DEBUG, `The resource is null, do not need to be destroyed.`, this.pool.options.debug);
      return Promise.resolve();
    }
    Utils.emitMessage(EventType.DEBUG,
      `Before destroy, pool size is ${this._pool.poolSize}, id of the resource to be destroyed is ${resource.id}`, this.pool.options.debug);

    // remove the resource from available list
    this._pool.removeResourceFromAvailable(resource);
    // remove the resource from all (the pool)
    this._pool.removeResourceFromAll(resource);
    if (resource.connection) {
      return Factory.destroy(resource.invalid().connection);
    }
    Utils.emitMessage(EventType.DEBUG, `After destroy, pool size is ${this._pool.poolSize}`, this.pool.options.debug);

    return Promise.resolve();
  }

  /**
   * Deliver the pooled connection to the request
   * @param {Resource} resource pooled connection
   * @return {Promise}
   */
  deliverPooledConnection(resource) {
    if (!resource || !resource.connection || resource.state === ResourceState.INVALID) {
      Utils.emitMessage(EventType.DEBUG,
        `Resource is empty or state is invalid, destroying it. ${resource ? 'The resource id is:' + resource.id : ''}`,
        this.pool.options.debug);
      return this.destroy(resource);
    }
    return Factory.validate(resource.connection).then((validateResult) => {
      if (validateResult) {
        // validate OK
        let clientResourceRequest = this.pool.dequeueFromRequestList();
        while (clientResourceRequest && clientResourceRequest.state !== RequestState.PENDING) {
          // keep dequeue from request line until we get the right request
          clientResourceRequest = this.pool.dequeueFromRequestList();
        }

        if (!clientResourceRequest) {
          // no valid request left, add the resource back to available list
          Utils.emitMessage(EventType.DEBUG,
            `No valid waiting request left, adding the resource back to available, state is: ${resource.state} , id is ${resource.id}`,
            this.pool.options.debug);
          return this._pool.addResourceToAvailable(resource);
        }
        Utils.emitMessage(EventType.DEBUG,
          `Allocated resource, state is: ${resource.state}, id is ${resource.id}, request id is ${clientResourceRequest.id}`,
          this.pool.options.debug);
        // deliver the connection to the request
        clientResourceRequest.resolve(resource.allocate().connection);
        Utils.increaseResolvedRequestNum();
        // return Promise.resolve();
      } else {
        Utils.emitMessage(EventType.DEBUG,
          `Connection validation failed, destroying it. Resource id is ${resource.id}`, this.pool.options.debug);
        return this.destroy(resource.invalid());
      }
    }).catch((err) => {
      Utils.emitMessage(EventType.CONNECTION_VALIDATION_ERROR, err);
      return this.destroy(resource.invalid());
    });
  }

  /**
   * Work function, must be overridden by sub class
   */
  work() {
    throw new Error('Not implemented!');
  }
}

exports = module.exports = Operator;
