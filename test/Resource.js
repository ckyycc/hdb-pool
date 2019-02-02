'use strict';
const Resource = require('../lib/Resource');
const should = require('should');
const ResourceState = require('../lib/types/ResourceState');

describe('Resource', function () {
  let resource;
  beforeEach(() => {
    resource = new Resource({});
  });
  describe('#allocate', function () {
    it('#should update _lastAllocateTime', function () {
      resource['_lastAllocateTime'] = 0;
      resource.allocate();
      should(resource.lastAllocateTime).above(0);
    });
    it('#should set state to allocated', function () {
      resource['_state'] = ResourceState.IDLE;
      resource.allocate();
      should(resource.state).exactly(ResourceState.ALLOCATED);
    });
    it('#should return itself', function () {
      should(resource.allocate()).exactly(resource);
    });
  });

  describe('#idle', function () {
    it('#should update _lastIdleTime if state is not idle', function () {
      resource['_lastIdleTime'] = 0;
      resource['_state'] = ResourceState.ALLOCATED;
      resource.idle();
      should(resource.lastIdleTime).above(0);
    });
    it('#should not update _lastIdleTime if state is idle', function () {
      resource['_lastIdleTime'] = 0;
      resource['_state'] = ResourceState.IDLE;
      resource.idle();
      should(resource.lastIdleTime).equals(0);
    });
    it('#should set state to idle', function () {
      resource['_state'] = ResourceState.ALLOCATED;
      resource.idle();
      should(resource.state).exactly(ResourceState.IDLE);
    });
    it('#should return itself', function () {
      should(resource.idle()).exactly(resource);
    });
  });

  describe('#invalid', function () {
    it('#should set state to invalid', function () {
      resource['_state'] = ResourceState.IDLE;
      resource.invalid();
      should(resource.state).exactly(ResourceState.INVALID);
    });
    it('#should return itself', function () {
      should(resource.invalid()).exactly(resource);
    });
  });
});
