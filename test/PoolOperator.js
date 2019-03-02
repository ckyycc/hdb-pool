'use strict';
const PoolOperator = require('../lib/PoolOperator');
// use the parent just to prevent the warning message of the editor
const Stub = require('./utils/Stub');
const StubPoolOperator = require('./utils/StubPoolOperator');

const sinon = require('sinon');
const should = require('should');
const Pool = require('../lib/Pool');
const TaskType = require('../lib/types/TaskType');
const Resource = require('../lib/Resource');
const Request = require('../lib/Request');
const Factory = require('../lib/Factory');

describe('PoolOperator', function () {
  let operator, stub1, stub2, stub3, spy;
  beforeEach(() => {
    operator = new PoolOperator(new Pool({}, {max: 0}));
    stub1 = undefined;
    stub2 = undefined;
    stub3 = undefined;
    spy = undefined;
  });

  afterEach(() => {
    Stub.restore(stub1);
    Stub.restore(stub2);
    Stub.restore(stub3);
    Stub.restore(spy);
  });

  describe('#work', function () {
    it('#should call deliverPooledConnection with task.resource if task type is DELIVERY_NEW_CONNECTION.', function () {
      const task = {taskType: TaskType.DELIVERY_NEW_CONNECTION, resource: Symbol('TEST_OPERATOR')};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');
      operator.work(task).catch(() => '');
      sinon.assert.calledWith(stub1, task.resource);
    });

    it('#should call _returnConnectionToPool with task.resource if task type is RETURN_CONNECTION.', function () {
      const task = {taskType: TaskType.RETURN_CONNECTION, resource: Symbol('TEST_OPERATOR')};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_returnConnectionToPool');
      operator.work(task).catch(() => '');
      sinon.assert.calledWith(stub1, task.resource);
      Stub.restore(stub1);
    });

    it('#should call deliverPooledConnection with task.resource if task type is CHECK_IDLE_TIMEOUT.', function () {
      const task = {taskType: TaskType.CHECK_IDLE_TIMEOUT, resource: Symbol('TEST_OPERATOR')};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_checkIdleTimeout');
      operator.work(task).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });

    it('#should call _destroyConnection with task.resource if task type is DESTROY_CONNECTION.', function () {
      const task = {taskType: TaskType.DESTROY_CONNECTION, resource: Symbol('TEST_OPERATOR')};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_destroyConnection');
      operator.work(task).catch(() => '');
      sinon.assert.calledWith(stub1, task.resource);
    });

    it('#should call _clearPoolResources with task.resource if task type is CLEAN_POOL.', function () {
      const task = {taskType: TaskType.CLEAN_POOL};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_clearPoolResources');
      operator.work(task).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });

    it('#should call _initializePool with task.resource if task type is INITIALIZE_POOL.', function () {
      const task = {taskType: TaskType.INITIALIZE_POOL};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_initializePool');
      operator.work(task).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });

    it('#should return null if task type is unknown.', function () {
      const task = {taskType: 'TEST_TASK_TYPE', resource: Symbol('TEST_OPERATOR')};
      should(operator.work(task)).exactly(null);
    });
  });

  describe('#_ensureMinPoolResources', function () {
    it('#should call createPoolResource 3 times if min = 5 and  poolSize = 2 (min > poolSize).', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      operator.pool.options.min = 5;
      operator.pool.options.max = 5;
      operator.pool['_allResources'].length = 2;
      return operator['_ensureMinPoolResources']().then(() => {
        sinon.assert.callCount(stub1, 3);
      });
    });

    it('#should not call createPoolResource if (min == poolSize).', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      operator.pool.options.min = 2;
      operator.pool.options.max = 5;
      operator.pool['_allResources'].length = 2;
      return operator['_ensureMinPoolResources']().then(() => {
        sinon.assert.notCalled(stub1);
      });
    });

    it('#should not call createPoolResource if (min < poolSize).', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      operator.pool.options.min = 2;
      operator.pool.options.max = 5;
      operator.pool['_allResources'].length = 3;
      return operator['_ensureMinPoolResources']().then(() => {
        sinon.assert.notCalled(stub1);
      });
    });
  });

  describe('#_returnConnectionToPool', function () {
    it('#should add resource to available if resource can be found in the pool.', function () {
      const resource = Symbol('TEST_RETURN_CONNECTION_TO_POOL');
      stub1 = Stub.getStubForOperatorWithObject(operator.pool, 'getResourceFromConnectionInAll', resource);
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAvailable');

      return operator['_returnConnectionToPool']().then(() => {
        sinon.assert.calledWithExactly(stub2, resource);
      });
    });

    it('#return rejected promise if resource cannot be found in the pool', function () {
      const failedErr = 'it was not supposed to succeed.';
      stub1 = Stub.getStubForOperatorWithObject(operator.pool, 'getResourceFromConnectionInAll', undefined);
      return operator['_returnConnectionToPool']()
        .then(() => sinon.assert.fail(failedErr))
        .catch((err) => {
          should.notStrictEqual(err.message, failedErr);
        });
    });
  });

  describe('#_destroyConnection', function () {
    it('#should try to destroy the connection if resource can be found in the pool.', function () {
      const resource = Symbol('TEST_RETURN_CONNECTION_TO_POOL');
      stub1 = Stub.getStubForOperatorWithObject(operator.pool, 'getResourceFromConnectionInAll', resource);
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, '_ensureMinPoolResources');

      return operator['_destroyConnection']().then(() => {
        sinon.assert.calledWithExactly(stub2, resource);
      });
    });

    it('#should make sure the minimum pool resources after destroy is done successfully.', function () {
      const resource = Symbol('TEST_RETURN_CONNECTION_TO_POOL');
      stub1 = Stub.getStubForOperatorWithObject(operator.pool, 'getResourceFromConnectionInAll', resource);
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, '_ensureMinPoolResources');

      return operator['_destroyConnection']().then(() => {
        sinon.assert.calledOnce(stub3);
      });
    });

    it('#should return rejected promise after destroy failed.', function () {
      const resource = Symbol('TEST_RETURN_CONNECTION_TO_POOL');
      stub1 = Stub.getStubForOperatorWithObject(operator.pool, 'getResourceFromConnectionInAll', resource);
      stub2 = Stub.getStubForObjectWithRejectedPromise(operator, 'destroy', Stub.rejectErrorMessage);

      return operator['_destroyConnection']().catch((err) => {
        should(err).equals(Stub.rejectErrorMessage);
      });
    });

    it('#return empty resolved promise if resource cannot be found in the pool', function () {
      stub1 = Stub.getStubForOperatorWithObject(operator.pool, 'getResourceFromConnectionInAll', undefined);
      return operator['_destroyConnection']().then((msg) => {
        should(msg).equals(undefined);
      });
    });
  });

  describe('#_checkIdleTimeout', function () {
    it('#should not touch the resource if it is not timeout', function () {
      const resource1 = new Resource({});
      resource1['_lastIdleTime'] = Date.now();
      operator.pool['_availableResources'].push(resource1);
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, '_ensureMinPoolResources');
      return operator['_checkIdleTimeout']().then(() => {
        sinon.assert.notCalled(stub1);
      });
    });
    it('#should try to destroy all (3) the resources from the pool (total is 5) if idle timeout.', function () {
      const timeout = operator.pool.options.idleTimeout + 300000;

      const resource1 = new Resource({});
      resource1['_lastIdleTime'] = Date.now() - timeout;
      const resource2 = new Resource({});
      resource2['_lastIdleTime'] = Date.now() - timeout;
      const resource3 = new Resource({});
      resource3.allocate();
      const resource4 = new Resource({});
      resource4['_lastIdleTime'] = Date.now() - timeout;
      const resource5 = new Resource({});
      resource5.allocate();
      // push those resources to pool
      operator.pool['_availableResources'].push(...[resource1, resource2, resource3, resource4, resource5]);

      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, '_ensureMinPoolResources');

      return operator['_checkIdleTimeout']().then(() => {
        sinon.assert.callCount(stub1, 3);
      });
    });

    it('#should try to ensure the minimum pool resource if available size changed.', function () {
      const timeout = operator.pool.options.idleTimeout + 300000;

      const resource1 = new Resource({});
      resource1['_lastIdleTime'] = Date.now() - timeout;
      const resource2 = new Resource({});
      resource2['_lastIdleTime'] = Date.now() - timeout;
      const resource3 = new Resource({});
      resource3.allocate();
      const resource4 = new Resource({});
      resource4['_lastIdleTime'] = Date.now() - timeout;
      const resource5 = new Resource({});
      resource5.allocate();
      // push those resources to pool
      operator.pool['_availableResources'].push(...[resource1, resource2, resource3, resource4, resource5]);

      stub1 = StubPoolOperator.getStubForDestroy(operator);
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, '_ensureMinPoolResources');

      return operator['_checkIdleTimeout']().then(() => {
        sinon.assert.calledOnce(stub2);
      });
    });

    it('#should do nothing but return empty resolved promise if available size not changed.', function () {
      const resource1 = new Resource({});
      resource1.allocate();
      const resource2 = new Resource({});
      resource2.allocate();
      const resource3 = new Resource({});
      resource3.allocate();
      const resource4 = new Resource({});
      resource4.allocate();
      const resource5 = new Resource({});
      resource5.allocate();
      // push those resources to pool
      operator.pool['_availableResources'].push(...[resource1, resource2, resource3, resource4, resource5]);

      stub1 = StubPoolOperator.getStubForDestroy(operator);
      spy = sinon.spy(operator, '_ensureMinPoolResources');

      return operator['_checkIdleTimeout']().then(() => {
        sinon.assert.notCalled(spy);
      });
    });
  });

  describe('#_clearPoolResources', function () {
    it('#should destroy for all the connection in resources.', function () {
      const connection = {};
      connection.close = (cb) => cb();
      const resource = new Resource(connection);

      operator.pool.poolResources.push(resource);
      operator.pool.poolResources.push(resource);
      stub1 = Stub.getStubForObjectWithResolvedPromise(Factory, 'destroy');

      return operator['_clearPoolResources']().then(() => {
        sinon.assert.calledWith(stub1, connection);
        sinon.assert.calledTwice(stub1);
      });
    });

    it('#should invalid all the resources.', function () {
      const connection = {};
      connection.close = (cb) => cb();
      const resource = new Resource(connection);
      operator.pool.poolResources.push(resource);
      operator.pool.poolResources.push(resource);
      spy = sinon.spy(resource, 'invalid');
      return operator['_clearPoolResources']().then(() => {
        sinon.assert.calledTwice(spy);
      });
    });

    it('#should call reject for all the requests in the requests list.', function () {
      const request = new Request();

      operator.pool.requestList.push(request);
      operator.pool.requestList.push(request);
      stub1 = Stub.getStubForObjectWithResolvedPromise(request, 'reject');
      return operator['_clearPoolResources']().then(() => sinon.assert.calledTwice(stub1));
    });

    it('#should truncate all resources.', function () {
      const resource = Symbol('TEST_CLEAR');
      operator.pool.requestList.push(resource);
      operator.pool.poolResources.push(resource);
      operator.pool.availableResourceList.push(resource);
      return operator['_clearPoolResources']().then(() => {
        should(operator.pool.requestList.length).equals(0);
        should(operator.pool.poolResources.length).equals(0);
        should(operator.pool.availableResourceList.length).equals(0);
      });
    });
  });
});
