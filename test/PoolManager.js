'use strict';
const PoolManager = require('../lib/PoolManager');
const Stub = require('./utils/Stub');
const Utils = require('../lib/Utils');
const sinon = require('sinon');
const should = require('should');

describe('PoolManager', function () {
  let stub, poolManager;
  beforeEach(() => {
    poolManager = new PoolManager({});
    stub = undefined;
  });
  afterEach(() => {
    Stub.restore(stub);
  });
  describe('#getConnection', function () {
    it('#should call addRequestToRequestList once if pool is initialized.', function () {
      const poolManager = new PoolManager({}, {requestTimeout: 1});
      poolManager['_pool']['_initializeFlag'] = true;
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'addRequestToRequestList');
      poolManager.getConnection().catch(() => '');
      sinon.assert.calledOnce(stub);
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
  });
});
