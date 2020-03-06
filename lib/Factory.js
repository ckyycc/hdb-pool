'use strict';
const Utils = require('./Utils');

const hana = Utils.getHanaClient();

/**
 * @class
 * @private
 */
class Factory {
  /**
   * Create HANA connection
   * @param {*} params connect parameters
   * @return {Promise}
   */
  static create(params) {
    const isHANAClient = Utils.isHANAClient(hana);
    // get params for db
    const dbParams = Utils.getPoolParams(params, isHANAClient);
    // for module 'node-hdb'
    if (!isHANAClient) {
      return new Promise((resolve, reject) => {
        const conn = hana.createClient(dbParams);
        conn.connect(err => err ? reject(err) : resolve(conn));
      });
    }

    // for hana client
    return new Promise((resolve, reject) => {
      const conn = hana.createConnection();
      conn.connect(dbParams, err => err ? reject(JSON.stringify(err)) : resolve(conn));
    });
  }

  /**
   * Destroy/close HANA connection
   * @param {any} conn HANA connection
   * @return {Promise}
   */
  static destroy(conn) {
    return new Promise((resolve, reject) => {
      conn.close(err => err ? reject(err) : resolve());
    });
  }

  /**
   * Validate HANA connection
   * @param {any} conn HANA connection
   * @return {Promise<boolean>}
   */
  static validate(conn) {
    return new Promise((resolve) => {
      if (conn != null) {
        const status = Utils.isHANAClient(hana) ? conn.state() : conn.readyState;
        if (status === 'connected') {
          return resolve(true);
        }
      }
      resolve(false);
    });
  }
}

exports = module.exports = Factory;
