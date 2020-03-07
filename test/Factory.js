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
        should(err).be.exactly(JSON.stringify(rejectMsg));
        StubHANAClient.restore(stub);
      });
    });

    it('should reject with error when failing (hana-client)', function () {
      const rejectMsg = 'error occurs';
      const stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', true);
      const hana = Utils.getHanaClient();
      const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};
      connection.state = () => 'connected';
      connection.connect = (parameter, cb) => cb(rejectMsg);
      connection.close = (cb) => cb();
      const original = hana.createConnection;
      hana.createConnection = () => connection;

      return factory.create({})
        .then(() => {
          should(true).equals(false); // should not be here
        })
        .catch((err) => {
          should(err).be.exactly(JSON.stringify(rejectMsg));
          StubHANAClient.restore(stub);
          hana.createConnection = original;
        });
    });

    it('should reject with error when failing  (node-hdb)', function () {
      const rejectMsg = 'error occurs';
      const stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', false);
      const hana = Utils.getHanaClient();
      const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};
      connection.readyState = 'connected';
      connection.connect = (cb) => cb(rejectMsg);
      connection.close = (cb) => cb();
      const original = hana.createClient;
      hana.createClient = () => connection;

      return factory.create({})
        .then(() => {
          should(true).equals(false); // should not be here
        })
        .catch((err) => {
          should(err).be.exactly(rejectMsg);
          StubHANAClient.restore(stub);
          hana.createClient = original;
        });
    });

    it('should return promise with the created connection if no error (hana-client)', function () {
      const stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', true);
      const hana = Utils.getHanaClient();
      const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};
      connection.state = () => 'connected';
      connection.connect = (parameter, cb) => cb();
      connection.close = (cb) => cb();
      const original = hana.createConnection;
      hana.createConnection = () => connection;

      return factory.create({}).then((result) => {
        should(result).be.exactly(connection);
        StubHANAClient.restore(stub);
        hana.createConnection = original;
      });
    });

    it('should return promise with the created connection if no error (node-hdb', function () {
      const stub = StubHANAClient.getStubForOperatorWithObject(Utils, 'isHANAClient', false);
      const hana = Utils.getHanaClient();
      const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};
      connection.readyState = 'connected';
      connection.connect = (cb) => cb();
      connection.close = (cb) => cb();
      const original = hana.createClient;
      hana.createClient = () => connection;

      return factory.create({}).then((result) => {
        should(result).be.exactly(connection);
        StubHANAClient.restore(stub);
        hana.createClient = original;
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

    it('should return promise with false if connection is null', function () {
      return factory.validate(null).then((result) => should(result).be.exactly(false));
    });
  });
});
