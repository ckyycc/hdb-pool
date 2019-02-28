const Stub = require('./Stub');
const Utils = require('../../lib/Utils');
const hana = Utils.getHanaClient();
const isHANAClient = Utils.isHANAClient(hana);

let id = 0;

/**
 * Stub the HANA Client, create stub for createConnection
 */
class StubHANAClient extends Stub {
  /**
   * Create stub for createConnection of hana-client for the failed case
   * @param {string} errMessage
   * @return {stub}
   */
  static getStubCreateConnectionFailed(errMessage) {
    if (isHANAClient) {
      return this.getStub(hana, 'createConnection', () => {
        const conn = {};
        conn.connect = (parameter, cb) => cb(errMessage);
        return conn;
      });
    } else {
      return this.getStub(hana, 'createClient', () => {
        const conn = {};
        conn.connect = (cb) => cb(errMessage);
        return conn;
      });
    }
  }

  /**
   * Create stub for createConnection of hana-client for the succeed case.
   * Always returns the same connection for stub
   * @return {*} return {conn: conn, stub: stub}
   */
  static getStubCreateConnectionSucceedWithSingleConnection() {
    const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};

    if (isHANAClient) {
      const stub = this.getStub(hana, 'createConnection', () => connection);
      connection.state = () => 'connected';
      connection.connect = (parameter, cb) => cb();
      connection.close = (cb) => cb();
      return {connection, stub};
    } else {
      const stub = this.getStub(hana, 'createClient', () => connection);
      connection.readyState = 'connected';
      connection.connect = (cb) => cb();
      connection.close = (cb) => cb();
      return {connection, stub};
    }
  }

  /**
   * Create stub for createConnection of hana-client for the succeed case.
   * Returns new connection for stub
   * @return {stub}
   */
  static getStucCreateConnectionSucceedWithNewConnection() {
    if (isHANAClient) {
      return this.getStub(hana, 'createConnection', () => {
        const connection = {};
        connection.state = () => 'connected';
        connection.connect = (parameter, cb) => cb();
        connection.close = (cb) => cb();
        connection.id = ++id;
        connection.propertySymbol = Symbol('TEST_CONNECTION_CREATION');
        return connection;
      });
    } else {
      return this.getStub(hana, 'createClient', () => {
        const connection = {};
        connection.readyState = 'connected';
        connection.connect = (cb) => cb();
        connection.close = (cb) => cb();
        connection.id = ++id;
        connection.propertySymbol = Symbol('TEST_CONNECTION_CREATION');
        return connection;
      });
    }
  }
}

exports = module.exports = StubHANAClient;
