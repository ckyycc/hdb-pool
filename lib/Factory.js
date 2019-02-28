'use strict';
const Utils = require('./Utils');

const hana = Utils.getHanaClient();
const isHANAClient = Utils.isHANAClient(hana);

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
    // get params for db
    const dbParams = Utils.getPoolParams(params, isHANAClient);
    // for module 'node-hdb'
    if (!isHANAClient) {
      return new Promise((resolve, reject) => {
        const conn = hana.createClient(dbParams);
        conn.connect(err => {
          if (err) {
            reject(err);
          } else {
            resolve(conn);
          }
        });
      });
    }

    // for hana client
    return new Promise((resolve, reject) => {
      const conn = hana.createConnection();
      conn.connect(dbParams, (err) => {
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
    if (!isHANAClient) {
      return new Promise((resolve) => {
        if (conn && (conn.readyState !== 'disconnected' || conn.readyState !== 'closed')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    }

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
