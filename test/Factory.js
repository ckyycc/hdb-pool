'use strict';

const factory = require('../lib/Factory');
const should = require('should');
const StubHANAClient = require('./utils/StubHANAClient');

describe('Factory', function () {
  describe('#create', function () {
    it('should reject with error when failing', function () {
      const rejectMsg = 'error';
      const stub = StubHANAClient.getStubCreateConnectionFailed(rejectMsg);
      return factory.create().catch((err) => {
        should(err).be.exactly(rejectMsg);
        StubHANAClient.restore(stub);
      });
    });
    it('should return promise with the created connection if no error', function () {
      const {connection, stub} = StubHANAClient.getStubCreateConnectionSucceed();
      return factory.create().then((result) => {
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
    it('should reject with false when failing', function () {
      const conn = {};
      conn.state = function () {
        return 'not connected';
      };
      return factory.validate(conn).catch((err) => should(err).be.exactly(false));
    });
    it('should return promise with true if no error', function () {
      const conn = {};
      conn.state = function () {
        return 'connected';
      };
      return factory.validate(conn).then((result) => should(result).be.exactly(true));
    });
  });
});
