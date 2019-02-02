'use strict';

const RequestState = Object.freeze({
  PENDING: 'pending', // waiting for resource
  FULFILLED: 'fulfilled', // resource is allocated
  REJECTED: 'rejected' // rejected (timeout)
});

module.exports = RequestState;
