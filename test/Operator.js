'use strict';
const Operator = require('../lib/Operator');
const Stub = require('./utils/Stub');
const factory = require('../lib/Factory');
const Pool = require('../lib/Pool');

const sinon = require('sinon');
const should = require('should');

const ResourceState = require('../lib/types/ResourceState');
const RequestState = require('../lib/types/RequestState');

describe('Operator', function () {
  let operator, stub1, stub2, stub3, spy;
  beforeEach(() => {
    operator = new Operator(new Pool({}, {max: 0}));
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

  describe('#get pool', function () {
    it('#should return the pool object.', function () {
      should(operator.pool).exactly(operator['_pool']);
    });
  });

  describe('#createPoolResource', function () {
    beforeEach(() => {
      operator = new Operator(new Pool({}, {min: 0, max: 99}));
    });

    it('#should return with empty promise if no room left, addResourceToAll should not be called', function () {
      operator = new Operator(new Pool({}, {max: 1}));
      operator.pool.poolResources.push({});
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAll');
      return operator.createPoolResource().then((msg) => {
        should(msg).equals(undefined);
        sinon.assert.notCalled(stub1);
      });
    });
    it('#should call addResourceToAll if have room', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAll');
      stub2 = Stub.getStubForObjectWithResolvedPromise(factory, 'create', {});
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'replacePlaceHolderWithConnectionFromAll');
      return operator.createPoolResource().then(() => {
        sinon.assert.calledOnce(stub1);
      });
    });
    it('#should call Factory creation if have room', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAll');
      stub2 = Stub.getStubForObjectWithResolvedPromise(factory, 'create', {});
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'replacePlaceHolderWithConnectionFromAll');
      return operator.createPoolResource().then(() => {
        sinon.assert.calledOnce(stub2);
      });
    });
    it('#should call replacePlaceHolderWithConnectionFromAll if have room and factory creation is succeed', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAll');
      stub2 = Stub.getStubForObjectWithResolvedPromise(factory, 'create', {});
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'replacePlaceHolderWithConnectionFromAll');
      return operator.createPoolResource().then(() => {
        sinon.assert.calledOnce(stub1);
        sinon.assert.calledOnce(stub2);
        sinon.assert.calledOnce(stub3);
      });
    });
    it('#should call removeResourceFromAll and return a rejected Promise if have room and factory creation is failed', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAll');
      stub2 = Stub.getStubForObjectWithRejectedPromise(factory, 'create', Stub.rejectErrorMessage);
      stub3 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'removeResourceFromAll');
      return operator.createPoolResource()
        .then(() => sinon.assert.fail('it was not supposed to succeed.'))
        .catch((err) => {
          should(err).equals(Stub.rejectErrorMessage);
          sinon.assert.calledOnce(stub1);
          sinon.assert.calledOnce(stub2);
          sinon.assert.calledOnce(stub3);
        });
    });
  });

  describe('#destroy', function () {
    it('#should call removeResourceFromAvailable once.', function () {
      stub1 = Stub.getStub(operator.pool, 'removeResourceFromAvailable');
      operator.destroy({}).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });
    it('#should call removeResourceFromAll once.', function () {
      stub1 = Stub.getStub(operator.pool, 'removeResourceFromAll');
      operator.destroy({}).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });
    it('#should call resource invalid destroy once if resource.connection is not null.', function () {
      const resource = {};
      resource.connection = {};
      resource.invalid = () => '';
      spy = sinon.spy(resource, 'invalid');
      operator.destroy(resource).catch(() => '');
      sinon.assert.calledOnce(spy);
    });

    it('#should call Factory destroy once if resource.connection is not null.', function () {
      const resource = {};
      resource.connection = {};
      resource.invalid = () => '';
      spy = sinon.spy(factory, 'destroy');
      operator.destroy(resource).catch(() => '');
      sinon.assert.calledOnce(spy);
    });

    it('#should not call Factory destroy if resource.connection is null.', function () {
      const resource = {};
      spy = sinon.spy(factory, 'destroy');
      operator.destroy(resource).catch(() => '');
      sinon.assert.notCalled(spy);
    });

    it('#should not call resource invalid if resource.connection is null.', function () {
      const resource = {};
      resource.invalid = () => '';
      spy = sinon.spy(resource, 'invalid');
      operator.destroy(resource).catch(() => '');
      sinon.assert.notCalled(spy);
    });
    it('#should return empty resolved Promise if resource is null, should not call removeResourceFromAvailable.', function () {
      spy = sinon.spy(operator.pool, 'removeResourceFromAvailable');
      operator.destroy(null).then((msg) => {
        should(msg).equals(undefined);
        sinon.assert.notCalled(spy);
      });
    });
  });

  describe('#deliverPooledConnection', function () {
    it('#should call destroy if resource is null.', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      operator.deliverPooledConnection(null).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });
    it('#should call destroy if resource.connection is null.', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      operator.deliverPooledConnection({}).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });
    it('#should call destroy if resource.state === ResourceState.INVALID.', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      operator.deliverPooledConnection({connection: {}, state: ResourceState.INVALID}).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });
    it('#should call Factory valid if resource, resource.connection is not null and state is not invalid.', function () {
      stub1 = Stub.getStubForObjectWithResolvedPromise(factory, 'validate');
      const resource = {connection: {}, state: ResourceState.IDLE};
      resource.invalid = () => '';
      operator.deliverPooledConnection(resource).catch(() => '');
      sinon.assert.calledOnce(stub1);
    });
    it('#should call destroy if factory validation failed.', function () {
      const resource = {connection: {}, state: ResourceState.IDLE};
      resource.invalid = () => '';

      stub1 = Stub.getStubForObjectWithRejectedPromise(factory, 'validate');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');

      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledOnce(stub1);
        sinon.assert.calledOnce(stub2);
      });
    });
    it('#should call invalid if factory validation failed.', function () {
      const resource = {connection: {}, state: ResourceState.IDLE};
      resource.invalid = () => '';
      stub1 = Stub.getStubForObjectWithRejectedPromise(factory, 'validate');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      stub3 = sinon.spy(resource, 'invalid');
      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledOnce(stub3);
      });
    });

    it('#should call destroy if factory validation done with no message.', function () {
      const resource = {connection: {}, state: ResourceState.IDLE};
      resource.invalid = () => '';

      stub1 = Stub.getStubForObjectWithResolvedPromise(factory, 'validate');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');

      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledOnce(stub1);
        sinon.assert.calledOnce(stub2);
      });
    });
    it('#should call invalid if factory validation failed.', function () {
      const resource = {connection: {}, state: ResourceState.IDLE};
      resource.invalid = () => '';
      stub1 = Stub.getStubForObjectWithResolvedPromise(factory, 'validate');
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator, 'destroy');
      stub3 = sinon.spy(resource, 'invalid');
      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledOnce(stub3);
      });
    });
    it('#should call addResourceToAvailable if validation is succeed but no valid request.', function () {
      operator.pool.requestList.length = 0;
      const resource = {connection: {}, state: ResourceState.IDLE};
      resource.invalid = () => '';
      stub1 = Stub.getStubForObjectWithResolvedPromise(factory, 'validate', true);
      stub2 = Stub.getStubForObjectWithResolvedPromise(operator.pool, 'addResourceToAvailable');
      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledOnce(stub2);
      });
    });

    it('#should resolve the promise of the request with the connection of the resource if validation is succeed ' +
      'and request is valid (status = RequestState.PENDING).', function () {
      const conn = Symbol('TEST_CONNECTION');
      operator.pool.requestList.length = 0;
      // create a fake resource with connection
      const resource = {connection: conn, state: ResourceState.IDLE};
      resource.allocate = () => resource;
      // create a fake request with promise
      const request = {};
      request.resolve = (conn) => conn;
      // set state to IDLE
      request.state = RequestState.PENDING;
      // add the fake resource to queue
      operator.pool.requestList.push(request);
      stub1 = Stub.getStubForObjectWithResolvedPromise(factory, 'validate', true);
      spy = sinon.spy(request, 'resolve');
      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledWith(spy, conn);
        Stub.restore(stub1);
        Stub.restore(spy);
      });
    });
    it('#should call allocate for the resource if validation is succeed and request.status is PENDING).', function () {
      const conn = Symbol('TEST_CONNECTION');
      operator.pool.requestList.length = 0;
      // create a fake resource with connection
      const resource = {connection: conn, state: ResourceState.IDLE};
      resource.allocate = () => resource;

      // create a fake request with promise
      const request = {};
      request.resolve = (conn) => conn;
      // set state to IDLE
      request.state = RequestState.PENDING;
      // add the fake resource to queue
      operator.pool.requestList.push(request);
      stub1 = Stub.getStubForObjectWithResolvedPromise(factory, 'validate', true);
      spy = sinon.spy(resource, 'allocate');

      return operator.deliverPooledConnection(resource).then(() => {
        sinon.assert.calledOnce(spy);
      });
    });
  });

  describe('#work', function () {
    it('#should throw error if called.', function () {
      should(() => new Operator().work()).throw('Not implemented!');
    });
  });
});
