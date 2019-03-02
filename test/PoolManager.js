'use strict';
const PoolManager = require('../lib/PoolManager');
const Stub = require('./utils/Stub');
const Utils = require('../lib/Utils');
const sinon = require('sinon');
const should = require('should');
const Request = require('../lib/Request');
const RequestState = require('../lib/types/RequestState');
const EventType = require('../lib/types/EventType');

describe('PoolManager', function () {
  let stub, poolManager, spy;
  beforeEach(() => {
    poolManager = new PoolManager({});
    stub = undefined;
  });
  afterEach(() => {
    Stub.restore(stub);
    Stub.restore(spy);
  });
  describe('#getConnection', function () {
    it('#should call addRequestToRequestList once if pool is initialized.', function () {
      const poolManager = new PoolManager({}, {requestTimeout: 1});
      poolManager['_pool']['_initializeFlag'] = true;
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'addRequestToRequestList');
      poolManager.getConnection().catch(() => '');
      sinon.assert.calledOnce(stub);
    });

    it('#should emit the error once if pool is initialized and addRequestToRequestList gets rejected.', function () {
      // Util.emitMessage(EventType.ERROR, `getConnect error: ${err}`))
      const poolManager = new PoolManager({}, {requestTimeout: 1});
      poolManager['_pool']['_initializeFlag'] = true;
      stub = Stub.getStubForObjectWithRejectedPromise(poolManager['_pool'], 'addRequestToRequestList');
      spy = sinon.spy(Utils, 'emitMessage');
      return poolManager.getConnection().catch(() => {
        sinon.assert.calledWith(spy, EventType.ERROR);
      });
    });

    it('#should call initialize once if pool is not initialized.', function () {
      const poolManager = new PoolManager({}, {requestTimeout: 1});
      poolManager['_pool']['_initializeFlag'] = false;
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'initialize');
      poolManager.getConnection().catch(() => '');
      sinon.assert.calledOnce(stub);
    });
  });

  describe('#release', function () {
    it('#should call returnConnection of pool once.', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'returnConnection');
      poolManager.release().catch(() => '');
      sinon.assert.calledOnce(stub);
    });
  });
  describe('#destroy', function () {
    it('#should call destroyConnection of pool once.', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'destroyConnection');
      poolManager.destroy().catch(() => '');
      sinon.assert.calledOnce(stub);
    });
  });

  describe('#clear', function () {
    it('#should call clear of pool once.', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'clear');
      poolManager.clear().catch(() => '');
      sinon.assert.calledOnce(stub);
    });
  });

  describe('#eventEmitter', function () {
    it('#should Util.eventEmitter.', function () {
      should(PoolManager.eventEmitter).exactly(Utils.eventEmitter);
    });
  });

  describe('#getPoolStatusOverview', function () {
    it('#should return pool status overview.', function () {
      const overview = poolManager.getPoolStatusOverview();
      should(overview.hasOwnProperty('pool')).equals(true);
      should(overview.pool.hasOwnProperty('size')).equals(true);
      should(overview.pool.hasOwnProperty('min')).equals(true);
      should(overview.pool.hasOwnProperty('max')).equals(true);
      should(overview.pool.hasOwnProperty('available')).equals(true);
      should(overview.pool.hasOwnProperty('timeout')).equals(true);
      should(overview.hasOwnProperty('request')).equals(true);
      should(overview.request.hasOwnProperty('number')).equals(true);
      should(overview.request.hasOwnProperty('pending')).equals(true);
      should(overview.request.hasOwnProperty('max')).equals(true);
      should(overview.request.hasOwnProperty('resolved')).equals(true);
      should(overview.request.hasOwnProperty('rejected')).equals(true);
      should(overview.request.hasOwnProperty('timeout')).equals(true);
    });
    it('#should show pending request number.', function() {
      const request1 = new Request(5000);
      request1.promise.catch(() => '');
      request1['_state'] = RequestState.PENDING;

      const request2 = new Request(1);
      request2.promise.catch(() => '');
      request2['_state'] = RequestState.FULFILLED;
      poolManager['_pool'].requestList.push(...[request1, request2]);
      const overview = poolManager.getPoolStatusOverview();
      should(overview.request.pending).equals(1);
      request1.reject('');
    });
  });
});
