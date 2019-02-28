'use strict';

const factory = require('../lib/Factory');
const should = require('should');
const StubHANAClient = require('./utils/StubHANAClient');
const Utils = require('../lib/Utils');

describe('Factory', function () {
  describe('#create', function () {
    it('should reject with error when failing', function () {
      const rejectMsg = 'error';
      const stub = StubHANAClient.getStubCreateConnectionFailed(rejectMsg);
      return factory.create({}).catch((err) => {
        should(err).be.exactly(rejectMsg);
        StubHANAClient.restore(stub);
      });
    });
    it('should return promise with the created connection if no error', function () {
      const {connection, stub} = StubHANAClient.getStubCreateConnectionSucceedWithSingleConnection();
      return factory.create({}).then((result) => {
        should(result).be.exactly(connection);
        StubHANAClient.restore(stub);
      });
    });
  });
  describe('#destroy', function () {
    it('should reject with error when failing', function () {
      const rejectMsg = 'error';
      const conn = {};
      conn.close = function (cb) {
        cb(rejectMsg);
      };
      return factory.destroy(conn).catch((err) => should(err).be.exactly(rejectMsg));
    });
    it('should return empty promise if no error', function () {
      const conn = {};
      conn.close = function (cb) {
        cb();
      };
      return factory.destroy(conn).then((result) => should(result).be.exactly(undefined));
    });
  });

  describe('#validate', function () {
    let stub;
    afterEach(() => {
      StubHANAClient.restore(stub);
    });

    it('should resolve with false when failing if the driver is coming from HANA client', function () {
      const conn = {state: () => 'not connected'};
      stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', true);
      return factory.validate(conn).then((result) => should(result).be.exactly(false));
    });

    it('should resolve with false when failing if the driver is coming from node-hdb', function () {
      const conn = {readyState: 'not connected'};
      stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', false);
      return factory.validate(conn).then((result) => should(result).be.exactly(false));
    });

    it('should return promise with true if no error and the driver is coming from HANA client', function () {
      const conn = {state: () => 'connected'};
      stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', true);
      return factory.validate(conn).then((result) => should(result).be.exactly(true));
    });

    it('should return promise with true if no error and the driver is coming from node-hdb', function () {
      const conn = {readyState: 'connected'};

      stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', false);
      return factory.validate(conn).then((result) => should(result).be.exactly(true));
    });
  });
});
