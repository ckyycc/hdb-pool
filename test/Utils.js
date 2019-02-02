'use strict';

const should = require('should');
const Utils = require('../lib/Utils');
const sinon = require('sinon');

describe('Utils', function () {
  describe('#getPoolOptions', function () {
    it('should get default options if parameter is empty', function () {
      const DEFAULT_POOL_OPTIONS = {
        min: 3,
        max: 50,
        acquireTimeout: 5000,
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

    it('acquireTimeout should be set to 0 if the input is not a number', function () {
      const options = Utils.getPoolOptions({acquireTimeout: 'A'});
      should(options.acquireTimeout).exactly(0);
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

    it('debug should be set to true if the input is either a boolean true or a string "true"', function () {
      let options = Utils.getPoolOptions({debug: true});
      should(options.debug).exactly(true);
      options = Utils.getPoolOptions({debug: 'True'});
      should(options.debug).exactly(true);
    });
  });
  describe('#get eventEmitter', function () {
    it('should return the EventEmitter type object', function () {
      const jsonString = JSON.stringify(Utils.eventEmitter);
      should(jsonString.includes('domain') && jsonString.includes('_events') && jsonString.includes('_eventsCount')).exactly(true);
    });
  });
  describe('#emitMessage', function () {
    it('should invoke the event', function () {
      const spy = sinon.spy();
      const eventEmitter = Utils.eventEmitter;
      const event = 'testEvent';
      eventEmitter.on(event, spy);
      Utils.emitMessage(event, 'test1');
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, 'test1');
    });
  });
});
