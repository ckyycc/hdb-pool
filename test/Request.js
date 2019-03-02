'use strict';
const Request = require('../lib/Request');

const sinon = require('sinon');
const should = require('should');
const Stub = require('./utils/Stub');
const RequestState = require('../lib/types/RequestState');

describe('Request', function () {
  let stub, spy;
  beforeEach(() => {
    stub = undefined;
    spy = undefined;
  });
  afterEach(() => {
    Stub.restore(stub);
    Stub.restore(spy);
  });
  describe('#reject', function () {
    it('#should call _removeTimeout to remove timeout setting.', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_removeTimeout');
      request.reject();
      sinon.assert.calledOnce(spy);
    });

    it('#should set state to rejected if state is pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.PENDING;
      request.reject();
      should(request.state).exactly(RequestState.REJECTED);
    });

    it('#should not change state if state is not pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.FULFILLED;
      request.reject();
      should(request.state).exactly(RequestState.FULFILLED);
    });

    it('#should call request._reject with the provided reason if state is pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.PENDING;
      const reason = Symbol('REQUEST_REJECT');
      spy = sinon.spy(request, '_reject');
      request.reject(reason);
      sinon.assert.calledWith(spy, reason);
    });
    it('#should not call request._reject if state is not pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_reject');
      request['_state'] = RequestState.FULFILLED;
      request.reject();
      sinon.assert.notCalled(spy);
    });
  });
  describe('#resolve', function () {
    it('#should call _removeTimeout to remove timeout setting.', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_removeTimeout');
      request.resolve();
      sinon.assert.calledOnce(spy);
    });

    it('#should set state to fulfilled if state is pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.PENDING;
      request.resolve();
      should(request.state).exactly(RequestState.FULFILLED);
    });

    it('#should not change state if state is not pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.REJECTED;
      request.resolve();
      should(request.state).exactly(RequestState.REJECTED);
    });

    it('#should call request._resolve with the provided info if state is pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.PENDING;
      const info = Symbol('REQUEST_RESOLVE');
      spy = sinon.spy(request, '_resolve');
      request.resolve(info);
      sinon.assert.calledWith(spy, info);
    });
    it('#should not call request._resolve if state is not pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_resolve');
      request['_state'] = RequestState.REJECTED;
      request.resolve();
      sinon.assert.notCalled(spy);
    });
  });
  describe('#_removeTimeout', function () {
    it('#should call clearTimeout if _timeout > 0.', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      stub = Stub.getStubForOperatorWithObject(request, '_fireTimeout');
      const clock = sinon.useFakeTimers();
      // set time out (after 500 seconds)
      request['_timeout'] = setTimeout(() => request['_fireTimeout'](), 50000);
      // setTimeout should be removed by calling clearTimeout via _removeTimeout
      request['_removeTimeout']();
      clock.tick(500000);
      // the setTimeout should be removed ,  _fireTimeout does not get triggered.
      sinon.assert.notCalled(stub);
      clock.restore();
    });
    it('#should not call clearTimeout if _timeout <= 0.', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      stub = Stub.getStubForOperatorWithObject(request, '_fireTimeout');
      const clock = sinon.useFakeTimers();
      // set time out (after 500 seconds)
      request['_timeout'] = setTimeout(() => request['_fireTimeout'](), 50000);

      request['_timeout'] = 0;
      // setTimeout should be not removed by calling _removeTimeout because clearTimeout does not get triggered
      request['_removeTimeout']();
      clock.tick(500000);
      // _fireTimeout will be triggered, because setTimeout is not cleared.
      sinon.assert.calledOnce(stub);
      clock.restore();
    });
    it('#should set timeout to null.', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_timeout'] = 5;
      request['_removeTimeout']();
      should(request['_timeout']).exactly(null);
    });
  });
  describe('#_fireTimeout', function () {
    it('#should call reject', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, 'reject');
      request['_fireTimeout']();
      sinon.assert.calledOnce(spy);
    });
  });
  describe('#_setTimeout', function () {
    it('#should call reject is delay is not number', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, 'reject');
      request['_setTimeout']('AA');
      sinon.assert.calledOnce(spy);
    });
    it('#should not do anything if delay is not number and state is not in pending', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      request['_state'] = RequestState.REJECTED;
      spy = sinon.spy(request, 'reject');
      request['_setTimeout']('AA');
      sinon.assert.notCalled(spy);
    });
    it('#should call reject is delay is less than 0', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, 'reject');
      request['_setTimeout'](-1);
      sinon.assert.calledOnce(spy);
    });
    it('#should call reject is delay is equal 0', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, 'reject');
      request['_setTimeout'](0);
      sinon.assert.calledOnce(spy);
    });
    it('#should call _removeTimeout if timeout > 0', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_removeTimeout');
      stub = Stub.getStubForOperatorWithObject(request, '_fireTimeout');
      request['_timeout'] = 1;
      request['_setTimeout'](1);
      sinon.assert.calledOnce(spy);
    });
    it('#should call setTimeout and trigger _fireTimeout after _removeTimeout if timeout > 0', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_removeTimeout');
      stub = Stub.getStubForOperatorWithObject(request, '_fireTimeout');
      const clock = sinon.useFakeTimers();

      request['_timeout'] = 500000;
      request['_setTimeout'](500000);
      clock.tick(500000);

      sinon.assert.calledOnce(spy);
      sinon.assert.calledOnce(stub);
      should(stub.calledAfter(spy)).exactly(true);
      clock.restore();
    });
    it('#should call setTimeout directly if timeout <= 0', function () {
      const request = new Request(1);
      request.promise.catch(() => '');
      spy = sinon.spy(request, '_removeTimeout');
      stub = Stub.getStubForOperatorWithObject(request, '_fireTimeout');
      const clock = sinon.useFakeTimers();

      request['_timeout'] = 0;
      request['_setTimeout'](500000);
      clock.tick(500000);

      sinon.assert.notCalled(spy);
      sinon.assert.calledOnce(stub);
      clock.restore();
    });
    it('#should call _fireTimeout if timeout', function () {
      const request = new Request(30000);
      stub = Stub.getStub(request, '_fireTimeout', () => {
        request['_reject']();
      });
      request['_setTimeout'](1);
      return request.promise.catch(() => sinon.assert.calledOnce(stub));
    });
  });
});
