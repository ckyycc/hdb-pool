const Stub = require('./Stub');
const hana = require('@sap/hana-client');

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
   * Create stub for createConnection of hana-client for the succeed case
   * @return {any} return {conn: conn, stub: stub}
   */
  static getStubCreateConnectionSucceed() {
    const connection = {PROP: Symbol('TEST_CONNECTION_CREATION')};
    connection.state = () => 'connected';
    connection.connect = (parameter, cb) => cb();
    connection.close = (cb) => cb();

    const stub = this.getStub(hana, 'createConnection', () => connection);
    return {connection, stub};
  }
}
exports = module.exports = StubHANAClient;
