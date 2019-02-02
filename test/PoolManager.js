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
  describe('#getConnect', function () {
    it('#should call addRequestToRequestList once.', function () {
      const poolManager = new PoolManager({}, {acquireTimeout: 1});
      stub = Stub.getStubForObjectWithResolvedPromise(poolManager['_pool'], 'addRequestToRequestList');
      poolManager.getConnect().catch(() => '');
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
      should(poolManager.eventEmitter).exactly(Utils.eventEmitter);
    });
  });
});
