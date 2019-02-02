'use strict';

const EventType = Object.freeze({
  DEBUG: 'poolDebug', // debug info
  ERROR: 'poolError', // error info
  CONNECTION_CREATE_ERROR: 'connectionCreateError', // connection creation error
  CONNECTION_VALIDATION_ERROR: 'connectionValidationError', // connection validation error
  REQUEST_TIMEOUT: 'requestTimeout' // request timeout
});

module.exports = EventType;
