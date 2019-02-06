const Stub = require('./Stub');
const hana = require('@sap/hana-client');
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
    return this.getStub(hana, 'createConnection', () => {
      const conn = {};
      conn.connect = (parameter, cb) => cb(errMessage);
      return conn;
    });
  }

  /**
   * Create stub for createConnection of hana-client for the succeed case.
   * Always returns the same connection for stub
   * @return {any} return {conn: conn, stub: stub}
   */
  static getStubCreateConnectionSucceedWithSingleConnection() {
    const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};
    connection.state = () => 'connected';
    connection.connect = (parameter, cb) => cb();
    connection.close = (cb) => cb();

    const stub = this.getStub(hana, 'createConnection', () => connection);
    return {connection, stub};
  }

  /**
   * Create stub for createConnection of hana-client for the succeed case.
   * Returns new connection for stub
   * @return {stub}
   */
  static getStucCreateConnectionSucceedWithNewConnection() {
    return this.getStub(hana, 'createConnection', () => {
      const connection = {};
      connection.state = () => 'connected';
      connection.connect = (parameter, cb) => cb();
      connection.close = (cb) => cb();
      connection.id = ++id;
      connection.propertySymbol = Symbol('TEST_CONNECTION_CREATION');
      return connection;
    });
  }
}
exports = module.exports = StubHANAClient;
