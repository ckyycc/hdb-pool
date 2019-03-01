'use strict';

const should = require('should');
const Utils = require('../lib/Utils');
const sinon = require('sinon');
const eventType = require('../lib/types/EventType');
const Stub = require('./utils/Stub');

describe('Utils', function () {
  describe('#getPoolOptions', function () {
    it('should get default options if parameter is empty', function () {
      const DEFAULT_POOL_OPTIONS = {
        min: 3,
        max: 50,
        requestTimeout: 5000,
        maxWaitingRequests: 0,
        checkInterval: 0,
        idleTimeout: 30000,
        debug: false
      };
      let options = Utils.getPoolOptions({});
      should(options).deepEqual(DEFAULT_POOL_OPTIONS);

      options = Utils.getPoolOptions(undefined);
      should(options).deepEqual(DEFAULT_POOL_OPTIONS);

      options = Utils.getPoolOptions(null);
      should(options).deepEqual(DEFAULT_POOL_OPTIONS);
    });

    it('min should be set to max if min > max', function () {
      const options = Utils.getPoolOptions({min: 45, max: 35});
      should(options.min).exactly(options.max);
    });

    it('max should >= 1', function () {
      const options = Utils.getPoolOptions({max: 0});
      should(options.max).exactly(1);
    });

    it('min should be set to 0 if the input is not a number', function () {
      const options = Utils.getPoolOptions({min: 'A'});
      should(options.min).exactly(0);
    });

    it('max should be set to 1 if the input is not a number', function () {
      const options = Utils.getPoolOptions({max: 'A'});
      should(options.max).exactly(1);
    });

    it('requestTimeout should be set to 0 if the input is not a number', function () {
      const options = Utils.getPoolOptions({requestTimeout: 'A'});
      should(options.requestTimeout).exactly(0);
    });

    it('maxWaitingRequests should be set to 0 if the input is not a number', function () {
      const options = Utils.getPoolOptions({maxWaitingRequests: 'A'});
      should(options.maxWaitingRequests).exactly(0);
    });

    it('checkInterval should be set to 0 if the input is not a number', function () {
      const options = Utils.getPoolOptions({checkInterval: 'A'});
      should(options.checkInterval).exactly(0);
    });

    it('idleTimeout should be set to 0 if the input is not a number', function () {
      const options = Utils.getPoolOptions({idleTimeout: 'A'});
      should(options.idleTimeout).exactly(0);
    });

    it('debug should be set to false if the input is either not a boolean nor a string "true"', function () {
      const options = Utils.getPoolOptions({debug: 'A'});
      should(options.debug).exactly(false);
    });

    it('debug should be set to false if the input is empty', function () {
      const options = Utils.getPoolOptions({});
      should(options.debug).exactly(false);
    });

    it('debug should be set to true if the input is either a boolean true or a string "true"', function () {
      let options = Utils.getPoolOptions({debug: true});
      should(options.debug).exactly(true);
      options = Utils.getPoolOptions({debug: 'True'});
      should(options.debug).exactly(true);
    });
  });
  describe('#getPoolParams', function () {
    it('should return the parameters for HANA get connection if the driver is HANA client', function () {
      const params = {
        hostName: 'test1',
        port: '30015',
        userName: 'tester',
        password: 'testPWD'
      };
      const dbParams = Utils.getPoolParams(params);
      should(dbParams.HOST).exactly(params.hostName);
      should(dbParams.PORT).exactly(params.port);
      should(dbParams.UID).exactly(params.userName);
      should(dbParams.PWD).exactly(params.password);
    });
    it('should return the parameters for HANA get connection if the driver is node-hdb', function () {
      const params = {
        hostName: 'test1',
        port: '30015',
        userName: 'tester',
        password: 'testPWD'
      };
      const dbParams = Utils.getPoolParams(params, false);
      should(dbParams.host).exactly(params.hostName);
      should(dbParams.port).exactly(params.port);
      should(dbParams.user).exactly(params.userName);
      should(dbParams.password).exactly(params.password);
    });
  });
  describe('#getHanaClient', function () {
    let stub, requireEx;
    beforeEach(() => {
      const _module = require('module');
      // stub = sinon.stub(_module, '_load');
      stub = Stub.getStub(_module, '_load', () => {});
      // stub = sinon.stub(module, 'require');
      requireEx = new Error('ERROR');
      requireEx.code = 'MODULE_NOT_FOUND';
    });
    afterEach(() => {
      Stub.restore(stub);
    });
    it('should return client from hana-client if driver of HANA Client exists', function () {
      stub.withArgs('@sap/hana-client').returns({});
      stub.withArgs('hdb').throws(requireEx);
      should(Utils.getHanaClient().fromNodeHDB).equals(undefined);
    });

    it('should return client from node-hdb if driver of node-hdb exists', function () {
      stub.withArgs('@sap/hana-client').throws(requireEx);
      stub.withArgs('hdb').returns({fromNodeHDB: true});
      should(Utils.getHanaClient().fromNodeHDB).equals(true);
    });

    it('should return client from hana-client if both driver of HANA Client and node-hdb exists', function () {
      stub.withArgs('@sap/hana-client').returns({});
      stub.withArgs('hdb').returns({fromNodeHDB: true});
      should(Utils.getHanaClient().fromNodeHDB).equals(undefined);
    });

    it('should throw exception if neither driver of HANA Client nor node-hdb exists', function () {
      stub.withArgs('@sap/hana-client').throws(requireEx);
      stub.withArgs('hdb').throws(requireEx);
      try {
        Utils.getHanaClient();
        should(true).equals(false); // we should not reach here
      } catch (err) {
        should(err.code).equals('MODULE_NOT_FOUND');
      }
    });
  });

  describe('#isHANAClient', function () {
    it('should return true if driver is coming from HANA Client', function () {
      const hana = {fromNodeHDB: false};
      should(Utils.isHANAClient(hana)).equals(true);
    });
    it('should return false if driver is coming from node-hdb', function () {
      const hana = {fromNodeHDB: true};
      should(Utils.isHANAClient(hana)).equals(false);
    });
  });
  describe('#get eventEmitter', function () {
    it('should return the EventEmitter type object', function () {
      const jsonString = JSON.stringify(Utils.eventEmitter);
      should(jsonString.includes('domain') && jsonString.includes('_events') && jsonString.includes('_eventsCount')).exactly(true);
    });
  });
  describe('#emitMessage', function () {
    it('for Non-DEBUG event, should invoke the event if debug flag is not set', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = eventType.ERROR;
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1');
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, 'test1');
    });

    it('for Non-DEBUG event, should invoke the event if debug flag is false', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = eventType.ERROR;
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1', false);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, 'test1');
    });

    it('for Non-DEBUG event, should invoke the event if debug flag is true', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = eventType.ERROR;
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1', true);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, 'test1');
    });

    it('for DEBUG event, should not invoke the event if debug flag is not set', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = eventType.DEBUG;
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1');
      sinon.assert.notCalled(spy);
    });

    it('for DEBUG event, should not invoke the event if debug flag is false', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = eventType.DEBUG;
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1', false);
      sinon.assert.notCalled(spy);
    });

    it('for DEBUG event, should invoke the event if debug flag is true', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = eventType.DEBUG;
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1', true);
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, 'test1');
    });
  });
});
