const Stub = require('./Stub');

/**
 * Stub Pool Operator
 */
class StubPoolOperator extends Stub {
  /**
   * Create stub for destroy of pool operator
   * @param {PoolOperator} operator
   * @return {stub}
   */
  static getStubForDestroy(operator) {
    return this.getStub(operator, 'destroy', (resource) => {
      const index = operator.pool['_availableResources'].indexOf(resource);
      if (index > -1) {
        operator.pool['_availableResources'].splice(index, 1);
      }
      return Promise.resolve();
    });
  }
}

exports = module.exports = StubPoolOperator;
