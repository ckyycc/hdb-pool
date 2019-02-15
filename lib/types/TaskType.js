'use strict';

const TaskType = Object.freeze({
  DELIVERY_NEW_CONNECTION: 'deliveryNewConnection', // delivery new connection
  RETURN_CONNECTION: 'returnConnection', // return connection back to available
  REQUEST_CONNECTION: 'requestConnection', // request connection
  AVAILABLE_CONNECTION_CHANGED: 'availableConnectionChanged', // available connection changed
  CHECK_IDLE_TIMEOUT: 'checkIdleTimeout', // check for idle timeout
  DESTROY_CONNECTION: 'destroyConnection', // destroy connection
  CLEAN_POOL: 'cleanPool' // clean/remove/destroy all items in the pool
});

module.exports = TaskType;
