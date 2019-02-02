'use strict';
const RequestOperator = require('../lib/RequestOperator');
const Stub = require('./utils/Stub');
const Request = require('../lib/Request');
const sinon = require('sinon');
const should = require('should');
const Pool = require('../lib/Pool');
const TaskType = require('../lib/types/TaskType');

describe('RequestOperator', function () {
  let stub1, stub2, stub3, stub4, operator;
  beforeEach(() => {
    operator = new RequestOperator(new Pool({}, {max: 0}));
    stub1 = undefined;
    stub2 = undefined;
    stub3 = undefined;
    stub4 = undefined;
  });
  afterEach(() => {
    Stub.restore(stub1);
    Stub.restore(stub2);
    Stub.restore(stub3);
    Stub.restore(stub4);
  });

  describe('#work', function () {
    it('#should call _dispatchPooledConnections if task type is AVAILABLE_CONNECTION_CHANGED.', function () {
      const task = {taskType: TaskType.AVAILABLE_CONNECTION_CHANGED, resource: Symbol('TEST_OPERATOR')};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_dispatchPooledConnections');
      operator.work(task).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });

    it('#should call _handleNewRequest if task type is REQUEST_CONNECTION.', function () {
      const task = {taskType: TaskType.REQUEST_CONNECTION, resource: Symbol('TEST_OPERATOR')};
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, '_handleNewRequest');
      operator.work(task).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });

    it('#should return null if task type is unknown.', function () {
      const task = {taskType: 'TEST_TASK_TYPE', resource: Symbol('TEST_OPERATOR')};
      should(operator.work(task)).exactly(null);
    });
  });
  describe('#_handleNewRequest', function () {
    it('#should return empty resolve if parameter(request) is null/undefined.', function () {
      return operator['_handleNewRequest'](null).then(info => should(info).exactly(undefined));
    });

    it('#should remove non pending request first if parameter(request) is not null/undefined.', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeNonPendingRequest');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeRequestFromList');
      stub3 = Stub.getStubForObjectWithResolvedPromise(request, 'reject');
      stub4 = Stub.getStubForObjectWithResolvedPromise(operator, '_dispatchPooledConnections');

      operator['_handleNewRequest'](request).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });

    it('#should call removeRequestFromList first then request.reject if parameter(request) ' +
      'is not null/undefined, maxWaitingRequests > 0 and pool.requestList.length > maxWaitingRequests, .', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeNonPendingRequest');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeRequestFromList');
      stub3 = Stub.getStubForObjectWithResolvedPromise(request, 'reject');
      stub4 = Stub.getStubForObjectWithResolvedPromise(operator, '_dispatchPooledConnections');
      operator.pool.options.maxWaitingRequests = 2;
      operator.pool.requestList.length = 3;
      return operator['_handleNewRequest'](request).then(() => {
        should(stub2.calledAfter(stub1)).equals(true);
        should(stub3.calledAfter(stub2)).equals(true);
      });
    });

    it('#should call _dispatchPooledConnections at the end if parameter(request)' +
      'is not null/undefined, maxWaitingRequests > 0 and pool.requestList.length > maxWaitingRequests, .', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeNonPendingRequest');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeRequestFromList');
      stub3 = Stub.getStubForObjectWithResolvedPromise(request, 'reject');
      stub4 = Stub.getStubForObjectWithResolvedPromise(operator, '_dispatchPooledConnections');
      operator.pool.options.maxWaitingRequests = 2;
      operator.pool.requestList.length = 3;
      return operator['_handleNewRequest'](request).then(() => {
        should(stub2.calledAfter(stub1)).equals(true);
        should(stub3.calledAfter(stub2)).equals(true);
        should(stub4.calledAfter(stub3)).equals(true);
      });
    });

    it('#should call _dispatchPooledConnections at the end if parameter(request)' +
      'is not null/undefined, maxWaitingRequests <= 0 || pool.requestList.length <= maxWaitingRequests, .', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeNonPendingRequest');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, '_dispatchPooledConnections');
      return operator['_handleNewRequest'](request).then(() => {
        should(stub2.calledAfter(stub1)).equals(true);
      });
    });
  });
  describe('#_dispatchPooledConnections', function() {
    it('#should return empty resolved promise if request list is empty', function() {
      operator.pool.requestList.length = 0;
      return operator['_dispatchPooledConnections']().then((msg) => should(msg).exactly(undefined));
    });
    it('#should return empty resolved promise if available list is empty and no room left', function() {
      operator.pool.requestList.length = 1;
      operator.pool['_availableResources'].length = 0;
      // room = options.max - _allResources.length
      operator.pool['_allResources'].length = 1;
      operator.pool.options.max = 1;
      return operator['_dispatchPooledConnections']().then((msg) => should(msg).exactly(undefined));
    });

    /**
     * N = length of request - length of available list - num of placeholder
     */
    it('#should call createPoolResource N times (N < room) if request list is not empty and (available list is not ' +
      'empty or has some room left)', function() {
      const testTimes = 4;
      operator.pool['_availableResources'].length = 3;
      operator.pool['_allResources'].length = 0;
      const creationPlaceHolder1 = Symbol('PlaceHolder4Creation');
      const creationPlaceHolder2 = Symbol('PlaceHolder4Creation');
      operator.pool.requestList.length = testTimes + 3 + 2;

      operator.pool['_allResources'].push(creationPlaceHolder1);
      operator.pool['_allResources'].push(creationPlaceHolder2);

      // room = options.max - _allResources.length
      operator.pool.options.max = 99;

      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'dequeueFromAvailableResources');
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');

      return operator['_dispatchPooledConnections']().then(() => {
        sinon.assert.callCount(stub1, 4);
      });
    });

    /**
     * N = length of request - length of available list - num of placeholder
     */
    it('#should call createPoolResource Room times (N >= room) if request list is not empty and (available list is not ' +
      'empty or has some room left)', function() {
      const testTimes = 3;
      operator.pool.requestList.length = 9;
      operator.pool['_availableResources'].length = 3;
      operator.pool['_allResources'].length = 0;
      const creationPlaceHolder1 = Symbol('PlaceHolder4Creation');
      const creationPlaceHolder2 = Symbol('PlaceHolder4Creation');

      operator.pool['_allResources'].push(creationPlaceHolder1);
      operator.pool['_allResources'].push(creationPlaceHolder2);

      // room = options.max - _allResources.length
      operator.pool.options.max = testTimes + 2; // room is 3

      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'dequeueFromAvailableResources');
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');

      return operator['_dispatchPooledConnections']().then(() => {
        sinon.assert.callCount(stub1, 3);
      });
    });

    it('#should call deliverPooledConnection requestList.length times if requestList.length < availableResource Number ' +
      'after promises(createPoolResource) are finished.', function() {
      const testTimes = 9;
      operator.pool.requestList.length = testTimes;
      operator.pool['_availableResources'].length = 99;
      operator.pool['_allResources'].length = 0;
      const creationPlaceHolder1 = Symbol('PlaceHolder4Creation');
      const creationPlaceHolder2 = Symbol('PlaceHolder4Creation');

      operator.pool['_allResources'].push(creationPlaceHolder1);
      operator.pool['_allResources'].push(creationPlaceHolder2);

      // room = options.max - _allResources.length
      operator.pool.options.max = 5; // room is 3
      const connection = Symbol('TEST_DELIVERY');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      stub2 = Stub.getStubForOperatorWithObject(operator.pool, 'dequeueFromAvailableResources', connection);
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');

      return operator['_dispatchPooledConnections']().then(() => {
        sinon.assert.callCount(stub3, testTimes);
      });
    });

    it('#should call deliverPooledConnection requestList.length times with the output of dequeueFromAvailableResources ' +
      'if requestList.length < availableResource Number after promises(createPoolResource) are finished.', function() {
      const testTimes = 9;
      operator.pool.requestList.length = testTimes;
      operator.pool['_availableResources'].length = 99;
      operator.pool['_allResources'].length = 0;
      const creationPlaceHolder1 = Symbol('PlaceHolder4Creation');
      const creationPlaceHolder2 = Symbol('PlaceHolder4Creation');

      operator.pool['_allResources'].push(creationPlaceHolder1);
      operator.pool['_allResources'].push(creationPlaceHolder2);

      // room = options.max - _allResources.length
      operator.pool.options.max = 5; // room is 3
      const connection = Symbol('TEST_DELIVERY');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      stub2 = Stub.getStubForOperatorWithObject(operator.pool, 'dequeueFromAvailableResources', connection);
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');

      return operator['_dispatchPooledConnections']().then(() => {
        sinon.assert.alwaysCalledWithExactly(stub3, connection);
      });
    });

    it('#should call deliverPooledConnection availableResource.Number times if requestList.length > availableResource Number ' +
      'after promises(createPoolResource) are finished.', function() {
      const testTimes = 5;
      operator.pool.requestList.length = 99;
      operator.pool['_availableResources'].length = testTimes;
      operator.pool['_allResources'].length = 0;
      const creationPlaceHolder1 = Symbol('PlaceHolder4Creation');
      const creationPlaceHolder2 = Symbol('PlaceHolder4Creation');

      operator.pool['_allResources'].push(creationPlaceHolder1);
      operator.pool['_allResources'].push(creationPlaceHolder2);

      // room = options.max - _allResources.length
      operator.pool.options.max = 5; // room is 3
      const connection = Symbol('TEST_DELIVERY');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      stub2 = Stub.getStubForOperatorWithObject(operator.pool, 'dequeueFromAvailableResources', connection);
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');

      return operator['_dispatchPooledConnections']().then(() => {
        sinon.assert.callCount(stub3, testTimes);
      });
    });

    it('#should call deliverPooledConnection availableResource.Number times with the output of dequeueFromAvailableResources ' +
      'if requestList.length > availableResource Number after promises(createPoolResource) are finished.', function() {
      const testTimes = 5;
      operator.pool.requestList.length = 99;
      operator.pool['_availableResources'].length = testTimes;
      operator.pool['_allResources'].length = 0;
      const creationPlaceHolder1 = Symbol('PlaceHolder4Creation');
      const creationPlaceHolder2 = Symbol('PlaceHolder4Creation');

      operator.pool['_allResources'].push(creationPlaceHolder1);
      operator.pool['_allResources'].push(creationPlaceHolder2);

      // room = options.max - _allResources.length
      operator.pool.options.max = 5; // room is 3
      const connection = Symbol('TEST_DELIVERY');
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'createPoolResource');
      stub2 = Stub.getStubForOperatorWithObject(operator.pool, 'dequeueFromAvailableResources', connection);
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator, 'deliverPooledConnection');

      return operator['_dispatchPooledConnections']().then(() => {
        sinon.assert.alwaysCalledWithExactly(stub3, connection);
      });
    });
  });
});
