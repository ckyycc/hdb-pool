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
  afterEach(function () {
    if (poolManager != null) {
      poolManager['_pool'].clear().catch(() => '');
    }
  });

  describe('#test-with-same-connection', function () {
    before(() => {
      const connectionInfos = StubHANAClient.getStubCreateConnectionSucceedWithSingleConnection();
      connection = connectionInfos.connection;
      stub = connectionInfos.stub;
    });
    after(() => {
      StubHANAClient.restore(stub);
    });

    describe('#new', function () {
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
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(conn => {
            should(conn).exactly(connection);
            const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
            // the status of this one should be allocated
            should(resource.state).equals(ResourceState.ALLOCATED);
            // we should still have no available connection in the available list
            should(poolManager['_pool'].availableResourceNum).equals(0);
            // we should have 5 resources in total
            should(poolManager['_pool'].poolSize).equals(2);
          });
      });
      it('#call getConnection three times should get three connections from pool.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(conn => {
            should(conn).exactly(connection);
            const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
            // the status of this one should be allocated
            should(resource.state).equals(ResourceState.ALLOCATED);
            // we should still have no available connection in the available list
            should(poolManager['_pool'].availableResourceNum).equals(0);
            // we should have 5 resources in total
            should(poolManager['_pool'].poolSize).equals(3);
          });
      });
      it('#call getConnection four times, should get four connections from pool.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(conn => {
            should(conn).exactly(connection);
            const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
            // the status of this one should be allocated
            should(resource.state).equals(ResourceState.ALLOCATED);
            // we should still have no available connection in the available list
            should(poolManager['_pool'].availableResourceNum).equals(0);
            // we should have 5 resources in total
            should(poolManager['_pool'].poolSize).equals(4);
          });
      });
      it('#call getConnection five times, should get five connections from pool.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(conn => {
            should(conn).exactly(connection);
            const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
            // the status of this one should be allocated
            should(resource.state).equals(ResourceState.ALLOCATED);
            // we should still have no available connection in the available list
            should(poolManager['_pool'].availableResourceNum).equals(0);
            // we should have 5 resources in total
            should(poolManager['_pool'].poolSize).equals(5);
          });
      });
      it('#call getConnection 6 times, 1 request should fail (timeout), the other five should be successful.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .catch(error => {
            should.notStrictEqual(error, connection);
            should(error.message.includes('Request timeout')).equals(true);
            should(poolManager['_pool'].availableResourceNum).equals(0);
            should(poolManager['_pool'].poolSize).equals(5);
            should(poolManager['_pool'].requestList.length).equals(1);
            should(poolManager['_pool'].requestList[0].state).exactly(RequestState.REJECTED);
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
  });

  describe('#test-with-new-connection', function () {
    before(() => {
      stub = StubHANAClient.getStucCreateConnectionSucceedWithNewConnection();
    });
    after(() => {
      StubHANAClient.restore(stub);
    });
    describe('#destroy', function () {
      beforeEach(function () {
        poolManager = new PoolManager(params, opts);
      });
      it('#call destroy should destroy the connection from pool.', function () {
        return poolManager.getConnect().then(conn => {
          should(poolManager['_pool'].getResourceFromConnectionInAll(conn) == null).equals(false);
          return poolManager.destroy(conn).then(() => {
            should(poolManager['_pool'].getResourceFromConnectionInAll(conn) == null).equals(true);
          });
        });
      });
      it('#poolsize should -1 after destroy if pool size > minimum.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(conn => {
            const poolSize = poolManager['_pool'].poolSize;
            return poolManager.destroy(conn).then(() => {
              should(poolManager['_pool'].poolSize).equals(poolSize - 1);
            });
          });
      });
      it('#poolsize should = minimum after destroy if pool size = minimum.', function () {
        return poolManager.getConnect().then(conn => {
          const poolSize = poolManager['_pool'].poolSize;
          return poolManager.destroy(conn).then(() => {
            should(poolManager['_pool'].poolSize).equals(poolSize);
          });
        });
      });
    });

    describe('#getConnection + release', function () {
      beforeEach(function () {
        poolManager = new PoolManager(params, opts);
      });
      it('#if no resource is available, getConnection can only be done successfully after release.', function () {
        let connection;
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then((conn) => {
            connection = conn;
            return poolManager.getConnect();
          })
          .catch(() => {
            // failed for the sixth request
            should(poolManager['_pool'].availableResourceNum).equals(0);
            return poolManager.release(connection)
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                return poolManager.getConnect();
              })
              .then((conn) => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should(conn).exactly(connection);
              });
          });
      });
      it('#only one getConnection can only be done successfully after one release.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then((conn) => {
            return poolManager.release(conn)
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                return poolManager.getConnect();
              })
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                return poolManager.getConnect();
              })
              .catch(error => {
                should.notStrictEqual(error, conn);
                should(error.message.includes('Request timeout')).equals(true);
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should(poolManager['_pool'].poolSize).equals(5);
                should(poolManager['_pool'].requestList.length).equals(1);
                should(poolManager['_pool'].requestList[0].state).exactly(RequestState.REJECTED);
              });
          });
      });
      it('#connection can be released after getConnection is done, even it was released before.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then((connection) => {
            return poolManager.release(connection)
              .then(() => poolManager.getConnect())
              .then((conn) => {
                should(connection).exactly(conn);
                return poolManager.release(conn);
              })
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                should(poolManager['_pool'].poolSize).equals(5);
                should(poolManager['_pool'].requestList.length).equals(0);
              });
          });
      });
      it('#getConnection can get the connection successfully after the connection was released twice.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then((connection) => {
            return poolManager.release(connection)
              .then(() => poolManager.getConnect())
              .then((conn) => poolManager.release(conn))
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                return poolManager.getConnect();
              })
              .then((conn) => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should(conn).exactly(connection);
              });
          });
      });
    });

    describe('#getConnection + destroy', function () {
      beforeEach(function () {
        poolManager = new PoolManager(params, opts);
      });
      it('#if no resource is available, getConnection can be successful after destroy, but acquired connection is a new one.', function () {
        return poolManager.getConnect()
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then(() => poolManager.getConnect())
          .then((conn1) => {
            // failed for the sixth request
            should(poolManager['_pool'].availableResourceNum).equals(0);
            return poolManager.destroy(conn1)
              .then(() => poolManager.getConnect())
              .then((conn2) => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should.notStrictEqual(conn1, conn2);
              });
          });
      });
    });

    describe('#release + destroy', function () {
      beforeEach(function () {
        poolManager = new PoolManager(params, opts);
      });
      it('#destoried connection can not be added back to queue (release).', function () {
        return poolManager.getConnect()
          .then((conn) =>
            poolManager.destroy(conn)
              .then(() => poolManager.release(conn))
              .catch((err) => {
                should(err.message.includes('Connection is not part of this pool')).equals(true);
              }));
      });

      it('#released connection can not destroyed.', function () {
        return poolManager.getConnect()
          .then((conn) =>
            poolManager.release(conn)
              .then(() => poolManager.destroy(conn))
              .then(() => {
                should(poolManager['_pool'].getResourceFromConnectionInAll(conn)).equals(null);
              }));
      });
    });
  });
});
