'use strict';
const PoolManager = require('../lib/PoolManager');
const StubHANAClient = require('./utils/StubHANAClient');
const should = require('should');
const ResourceState = require('../lib/types/ResourceState');
const RequestState = require('../lib/types/RequestState');
const Factory = require('../lib/Factory');
const Stub = require('./utils/Stub');
const sinon = require('sinon');

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
  beforeEach(function () {
    poolManager = new PoolManager(params, opts);
  });
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
      it('#Shoud have minimum resources being created after initialization', function () {
        const poolSize = 3;
        poolManager = new PoolManager(params, {min: poolSize});
        poolManager['_pool'].initialize().then(() => {
          should(poolManager['_pool'].poolSize).equals(poolSize);
        });
      });
      it('#Shoud not have any resource in available list during creation', function () {
        const poolSize = 3;
        poolManager = new PoolManager(params, {min: poolSize});
        should(poolManager['_pool'].availableResourceNum).equals(0);
      });
    });

    describe('options', function () {
      it('#request failed if the waiting request num >= maxWaitingRequests', function () {
        const promiseArray = [];
        const num = poolManager['_pool'].options.maxWaitingRequests + poolManager['_pool'].options.max;
        // the last one exceed the maxWaitingRequests
        for (let i = 0; i <= num; i++) {
          promiseArray.push(poolManager.getConnection());
        }

        return Promise.all(promiseArray)
          .catch(error => {
            should(error.message.includes('Max waiting requests count exceeded')).equals(true);
          });
      });
    });

    describe('#getConnection', function () {
      it('#call getConnection once should get one connection from pool (two in total).', function () {
        return poolManager.getConnection().then(conn => {
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
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
      it('#call release should return the connection to pool.', function () {
        return poolManager.getConnection().then(conn => {
          const availableResNum = poolManager['_pool'].availableResourceNum;
          return poolManager.release(conn)
            .then(() => should(poolManager['_pool'].availableResourceNum).equals(availableResNum + 1));
        });
      });
      it('#call release should not change the pool size.', function () {
        return poolManager.getConnection().then(conn => {
          const poolResNum = poolManager['_pool'].poolSize;
          return poolManager.release(conn)
            .then(() => should(poolManager['_pool'].poolSize).equals(poolResNum));
        });
      });
      it('#call release should set the state of the connection resource to idle.', function () {
        return poolManager.getConnection().then(conn => {
          const resource = poolManager['_pool'].getResourceFromConnectionInAll(conn);
          should(resource.state).equals(ResourceState.ALLOCATED);
          return poolManager.release(conn)
            .then(() => should(resource.state).equals(ResourceState.IDLE));
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
      it('#call destroy should destroy the connection from pool.', function () {
        return poolManager.getConnection().then(conn => {
          should(poolManager['_pool'].getResourceFromConnectionInAll(conn) == null).equals(false);
          return poolManager.destroy(conn)
            .then(() => should(poolManager['_pool'].getResourceFromConnectionInAll(conn) == null).equals(true));
        });
      });
      it('#poolsize should -1 after destroy if pool size > minimum.', function () {
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(conn => {
            const poolSize = poolManager['_pool'].poolSize;
            return poolManager.destroy(conn)
              .then(() => should(poolManager['_pool'].poolSize).equals(poolSize - 1));
          });
      });
      it('#poolsize should = minimum after destroy if pool size = minimum.', function () {
        return poolManager.getConnection().then(conn => {
          const poolSize = poolManager['_pool'].poolSize;
          return poolManager.destroy(conn)
            .then(() => should(poolManager['_pool'].poolSize).equals(poolSize));
        });
      });
    });

    describe('#getConnection + release', function () {
      it('#if no resource is available, getConnection can only be done successfully after release.', function () {
        let connection;
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then((conn) => {
            connection = conn;
            return poolManager.getConnection();
          })
          .catch(() => {
            // failed for the sixth request
            should(poolManager['_pool'].availableResourceNum).equals(0);
            return poolManager.release(connection)
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                return poolManager.getConnection();
              })
              .then((conn) => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should(conn).exactly(connection);
              });
          });
      });
      it('#only one getConnection can only be done successfully after one release.', function () {
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then((conn) => {
            return poolManager.release(conn)
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                return poolManager.getConnection();
              })
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                return poolManager.getConnection();
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then((connection) => {
            return poolManager.release(connection)
              .then(() => poolManager.getConnection())
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
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then((connection) => {
            return poolManager.release(connection)
              .then(() => poolManager.getConnection())
              .then((conn) => poolManager.release(conn))
              .then(() => {
                should(poolManager['_pool'].availableResourceNum).equals(1);
                return poolManager.getConnection();
              })
              .then((conn) => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should(conn).exactly(connection);
              });
          });
      });
    });

    describe('#getConnection + destroy', function () {
      it('#if no resource is available, getConnection can be successful after destroy, but acquired connection is a new one.', function () {
        return poolManager.getConnection()
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then(() => poolManager.getConnection())
          .then((conn1) => {
            // failed for the sixth request
            should(poolManager['_pool'].availableResourceNum).equals(0);
            return poolManager.destroy(conn1)
              .then(() => poolManager.getConnection())
              .then((conn2) => {
                should(poolManager['_pool'].availableResourceNum).equals(0);
                should.notStrictEqual(conn1, conn2);
              });
          });
      });
    });

    describe('#release + destroy', function () {
      it('#destoried connection can not be added back to queue (release).', function () {
        return poolManager.getConnection()
          .then((conn) => poolManager.destroy(conn)
            .then(() => poolManager.release(conn))
            .catch((err) => {
              should(err.message.includes('Connection is not part of this pool')).equals(true);
            }));
      });

      it('#released connection can be destroyed.', function () {
        return poolManager.getConnection()
          .then((conn) => poolManager.release(conn)
            .then(() => poolManager.destroy(conn))
            .then(() => {
              should(poolManager['_pool'].getResourceFromConnectionInAll(conn)).equals(null);
            }));
      });
    });

    describe('#clear + getConnection', function () {
      it('#clear should destroy everything, including the acquired connection.', function () {
        return poolManager.getConnection()
          .then((conn) => {
            const stub1 = Stub.getStubForObjectWithResolvedPromise(Factory, 'destroy');
            return poolManager.clear()
              .then(() => {
                sinon.assert.calledWith(stub1, conn);
                should(poolManager['_pool'].poolSize).equals(0);
                should(poolManager['_pool'].getResourceFromConnectionInAll(conn)).equals(null);
                Stub.restore(stub1);
              });
          });
      });

      /**
       * Not initialized, means getConnection will trigger the initialization, 1 will go to available list, 1 will be allocated
       */
      it('#getConnection can acquire new connection after clear if pool is not initialized.', function () {
        return poolManager.clear()
          .then(() => poolManager.getConnection())
          .then(conn => {
            should(conn == null).equals(false);
            should(poolManager['_pool'].poolSize).equals(2);
            should(poolManager['_pool'].availableResourceNum).equals(1);
          });
      });
      it('#getConnection can acquire new connection even after clear if pool is already initialized.', function () {
        return poolManager.getConnection()
          .then(() => poolManager.clear())
          .then(() => poolManager.getConnection())
          .then(conn => {
            should(conn == null).equals(false);
            should(poolManager['_pool'].poolSize).equals(1);
          });
      });
    });

    describe('#clear + getConnection + release', function () {
      it('#release can return the connection back to pool after clear (before being initialized) and getConnection.', function () {
        return poolManager.clear()
          .then(() => poolManager.getConnection()) // pool will get initialized here
          .then((conn) => poolManager.release(conn))
          .then(() => {
            should(poolManager['_pool'].poolSize).equals(2);
            should(poolManager['_pool'].availableResourceNum).equals(2);
          });
      });

      it('#release can return the connection back to pool after clear (after being initialized) and getConnection.', function () {
        return poolManager.getConnection() // pool will get initialized here
          .then(() => poolManager.clear())
          .then(() => poolManager.getConnection()) // will not trigger the initialization
          .then((conn) => poolManager.release(conn))
          .then(() => {
            should(poolManager['_pool'].poolSize).equals(1);
            should(poolManager['_pool'].availableResourceNum).equals(1);
          });
      });
    });

    describe('#big volume test', function () {
      function genPromiseArray(data, loop) {
        for (let i = 0; i < loop; i++) {
          const type = Math.floor(Math.random() * 3);
          switch (type) {
            case 0:
              data.promiseArray.push(poolManager.getConnection()
                .then(conn => {
                  data.connections[i] = conn;
                  data.validNum++;
                })
                .catch(() => ''));
              break;
            case 1:
              data.promiseArray.push(poolManager.getConnection()
                .then(conn => {
                  data.connections[i] = conn;
                  data.validNum++;
                  return poolManager.destroy(conn).then(() => {
                    data.destroyNum++;
                    data.validNum--;
                  });
                })
                .catch(() => ''));
              break;
            case 2:
              data.promiseArray.push(poolManager.getConnection()
                .then(conn => {
                  data.connections[i] = conn;
                  data.validNum++;
                  return poolManager.release(conn).then(() => {
                    data.releaseNum++;
                    data.validNum--;
                  });
                })
                .catch(() => ''));
          }
        }
      }

      it('#loop less than max: min = 10, max = 500, loop = 250', function () {
        const maxSize = 500;
        const loop = 500;
        poolManager = new PoolManager(params, {min: 10, max: maxSize});

        const data = {};
        data.validNum = 0;
        data.destroyNum = 0;
        data.releaseNum = 0;
        data.promiseArray = [];
        data.connections = new Array(maxSize);

        genPromiseArray(data, loop);

        return Promise.all(data.promiseArray)
          .then(() => {
            should(poolManager['_pool'].poolSize).equals(data.validNum + poolManager['_pool'].availableResourceNum);
            // the number which acquired from available list
            const fromAvailableList = data.releaseNum - poolManager['_pool'].availableResourceNum;
            should(data.destroyNum).equals(loop - (data.validNum + poolManager['_pool'].availableResourceNum + (fromAvailableList)));
          });
      });

      it('#loop equals max: min = 10, max = 500, loop = 500', function () {
        const maxSize = 500;
        const loop = 500;
        poolManager = new PoolManager(params, {min: 10, max: maxSize});

        const data = {};
        data.validNum = 0;
        data.destroyNum = 0;
        data.releaseNum = 0;
        data.promiseArray = [];
        data.connections = new Array(maxSize);

        genPromiseArray(data, loop);

        return Promise.all(data.promiseArray)
          .then(() => {
            should(poolManager['_pool'].poolSize).equals(data.validNum + poolManager['_pool'].availableResourceNum);
            // the number which acquired from available list
            const fromAvailableList = data.releaseNum - poolManager['_pool'].availableResourceNum;
            should(data.destroyNum).equals(loop - (data.validNum + poolManager['_pool'].availableResourceNum + (fromAvailableList)));
          });
      });

      it('#loop bigger than max: min = 10, max = 500, loop = 1000', function () {
        const maxSize = 500;
        const loop = 1000;
        poolManager = new PoolManager(params, {min: 10, max: maxSize});

        const data = {};
        data.validNum = 0;
        data.destroyNum = 0;
        data.releaseNum = 0;
        data.promiseArray = [];
        data.connections = new Array(maxSize);

        genPromiseArray(data, loop);

        return Promise.all(data.promiseArray)
          .then(() => {
            should(poolManager['_pool'].poolSize).equals(data.validNum + poolManager['_pool'].availableResourceNum);
            // the number which acquired from available list
            const fromAvailableList = data.releaseNum - poolManager['_pool'].availableResourceNum;
            should(data.destroyNum).equals(loop - (data.validNum + poolManager['_pool'].availableResourceNum + (fromAvailableList)));
          });
      });
    });
  });
});
