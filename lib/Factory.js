'use strict';
const hana = require('@sap/hana-client');

/**
 * @class
 * @private
 */
class Factory {
  /**
   * Create HANA connection
   * @param {any} params connect parameters
   * @return {Promise}
   */
  static create(params) {
    return new Promise((resolve, reject) => {
      const conn = hana.createConnection();
      conn.connect(params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
  }

  /**
   * Destroy/close HANA connection
   * @param {any} conn HANA connection
   * @return {Promise}
   */
  static destroy(conn) {
    return new Promise((resolve, reject) => {
      conn.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Validate HANA connection
   * @param {any} conn HANA connection
   * @return {Promise<boolean>}
   */
  static validate(conn) {
    return new Promise((resolve) => {
      if (conn && conn.state() === 'connected') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }
}

exports = module.exports = Factory;
