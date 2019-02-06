'use strict';
const PoolManager = require('../lib/PoolManager');
const StubHANAClient = require('./utils/StubHANAClient');
const should = require('should');
const ResourceState = require('../lib/types/ResourceState');
const RequestState = require('../lib/types/RequestState');
const params = {
  HOST: 'fakeServer',
  PORT: '30015',
  UID: 'HANA_SYSTEM',
  PWD: 'hana12345'
};
// Below testing cases are for getConnection with min 2, max 5, maxWaitingRequests 6.
const opts = {
  min: 2,
  max: 5,
  maxWaitingRequests: 6,
  checkInterval: 50000,
  acquireTimeout: 800
};
describe('#Acceptance-PoolManager', function () {
  let poolManager, connection, stub;
  after(() => {
    StubHANAClient.restore(stub);
  });
  afterEach(function () {
    if (poolManager != null) {
      poolManager.clear().catch(() => '');
    }
  });

  describe('#creation', function () {
    before(() => {
      const connectionInfos = StubHANAClient.getStubCreateConnectionSucceed();
      connection = connectionInfos.connection;
      stub = connectionInfos.stub;
    });
    it('#Shoud have minimum resources being created during creation', function () {
      const poolSize = 3;
      poolManager = new PoolManager(params, {min: poolSize});
      should(poolManager['_pool'].poolSize).equals(poolSize);
    });
    it('#Shoud not have any resource in available list during creation', function () {
      const poolSize = 3;
      poolManager = new PoolManager(params, {min: poolSize});
      should(poolManager['_pool'].availableResourceNum).equals(0);
    });
  });

  describe('#getConnection', function () {
    beforeEach(function () {
      poolManager = new PoolManager(params, opts);
    });

    it('#call getConnection once should get one connection from pool (two in total).', function () {
      // Utils.registerEventForLoging(poolManager);
      return poolManager.getConnect().then(conn => {
        // the fetched connection should be exactly the same of the one we generated
        should(conn).exactly(connection);
        const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
        // the status of this one should be allocated
        should(resource.state).equals(ResourceState.ALLOCATED);
        // we should still have one available connection in the available list
        should(poolManager['_pool'].availableResourceNum).equals(1);
        // we should have two resource in total
        should(poolManager['_pool'].poolSize).equals(2);
      });
    });
    it('#call getConnection twice should get two connections from pool (two in total).', function () {
      // Utils.registerEventForLoging(poolManager);
      return poolManager.getConnect().then(() => {
        return poolManager.getConnect().then(conn2 => {
          // the fetched connection should be exactly the same of the one we generated
          should(conn2).exactly(connection);
          const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn2);
          // the status of this one should be allocated
          should(resource.state).equals(ResourceState.ALLOCATED);
          // we should still have one available connection in the available list
          should(poolManager['_pool'].availableResourceNum).equals(0);
          // we should have 2 resources in total
          should(poolManager['_pool'].poolSize).equals(2);
        });
      });
    });
    it('#call getConnection three times should get three connections from pool.', function () {
      // Utils.registerEventForLoging(poolManager);
      return poolManager.getConnect().then(() => {
        return poolManager.getConnect().then(() => {
          return poolManager.getConnect().then(conn3 => {
            // the fetched connection should be exactly the same of the one we generated
            should(conn3).exactly(connection);
            const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn3);
            // the status of this one should be allocated
            should(resource.state).equals(ResourceState.ALLOCATED);
            // we should still have no available connection in the available list
            should(poolManager['_pool'].availableResourceNum).equals(0);
            // we should have 3 resources in total
            should(poolManager['_pool'].poolSize).equals(3);
          });
        });
      });
    });
    it('#call getConnection four times, should get four connections from pool.', function () {
      // Utils.registerEventForLoging(poolManager);
      return poolManager.getConnect().then(() => {
        return poolManager.getConnect().then(() => {
          return poolManager.getConnect().then(() => {
            return poolManager.getConnect().then(conn4 => {
              // the fetched connection should be exactly the same of the one we generated
              should(conn4).exactly(connection);
              const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn4);
              // the status of this one should be allocated
              should(resource.state).equals(ResourceState.ALLOCATED);
              // we should still have no available connection in the available list
              should(poolManager['_pool'].availableResourceNum).equals(0);
              // we should have 4 resources in total
              should(poolManager['_pool'].poolSize).equals(4);
            });
          });
        });
      });
    });
    it('#call getConnection five times, should get five connections from pool.', function () {
      // Utils.registerEventForLoging(poolManager);
      return poolManager.getConnect().then(() => {
        return poolManager.getConnect().then(() => {
          return poolManager.getConnect().then(() => {
            return poolManager.getConnect().then(() => {
              return poolManager.getConnect().then(conn5 => {
                should(conn5).exactly(connection);
                const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn5);
                // the status of this one should be allocated
                should(resource.state).equals(ResourceState.ALLOCATED);
                // we should still have no available connection in the available list
                should(poolManager['_pool'].availableResourceNum).equals(0);
                // we should have 5 resources in total
                should(poolManager['_pool'].poolSize).equals(5);
              });
            });
          });
        });
      });
    });
    it('#call getConnection 6 times, 1 request should fail (timeout), the other five should be successful.', function () {
      // Utils.registerEventForLoging(poolManager);
      return poolManager.getConnect().then(() => {
        return poolManager.getConnect().then(() => {
          return poolManager.getConnect().then(() => {
            return poolManager.getConnect().then(() => {
              return poolManager.getConnect().then(() => {
                return poolManager.getConnect().catch((error) => {
                  should.notStrictEqual(error, connection);
                  should(error.message.includes('Request timeout')).equals(true);
                  should(poolManager['_pool'].availableResourceNum).equals(0);
                  should(poolManager['_pool'].poolSize).equals(5);
                  should(poolManager['_pool'].requestList.length).equals(1);
                  should(poolManager['_pool'].requestList[0].state).exactly(RequestState.REJECTED);
                });
              });
            });
          });
        });
      });
    });
  });

  describe('#release', function () {
    beforeEach(function () {
      poolManager = new PoolManager(params, opts);
    });
    it('#call release should return the connection to pool.', function () {
      return poolManager.getConnect().then(conn => {
        const availableResNum = poolManager['_pool'].availableResourceNum;
        return poolManager.release(conn).then(() => {
          should(poolManager['_pool'].availableResourceNum).equals(availableResNum + 1);
        });
      });
    });
    it('#call release should not change the pool size.', function () {
      return poolManager.getConnect().then(conn => {
        const poolResNum = poolManager['_pool'].poolSize;
        return poolManager.release(conn).then(() => {
          should(poolManager['_pool'].poolSize).equals(poolResNum);
        });
      });
    });
    it('#call release should set the state of the connection resource to idle.', function () {
      return poolManager.getConnect().then(conn => {
        const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
        should(resource.state).equals(ResourceState.ALLOCATED);
        return poolManager.release(conn).then(() => {
          should(resource.state).equals(ResourceState.IDLE);
        });
      });
    });
  });

  describe('#destroy', function () {
    beforeEach(function () {
      poolManager = new PoolManager(params, opts);
    });
    it('#call destroy should destroy the connection from pool.', function () {
      return poolManager.getConnect().then(conn => {
        console.log('1111', poolManager['_pool']._allResources);
        should(poolManager['_pool'].getResourceFromConnectionInAll(conn) == null).equals(false);
        return poolManager.destroy(conn).then(() => {
          console.log('2222', poolManager['_pool']._allResources);
          should(poolManager['_pool'].getResourceFromConnectionInAll(conn) == null).equals(true);
        });
      });
    });
  });

});
