'use strict';

const ResourceState = Object.freeze({
  ALLOCATED: 'allocated', // In use
  IDLE: 'idle', // In the queue, available for requesting
  INVALID: 'invalid' // deleted
});

module.exports = ResourceState;
