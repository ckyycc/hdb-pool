const Pool = require('./lib/PoolManager');
exports.Pool = Pool;
exports.createPool = (dbParams, options) => new Pool(dbParams, options);
exports.eventEmitter = Pool.eventEmitter;
