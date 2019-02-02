const sinon = require('sinon');

/**
 * Root class for mocking
 */
class Stub {
  /**
   * Generate the stub for the method
   * @param {Object} obj the object needs to be stubbed
   * @param {String} methodName
   * @param {function} fakeMethod function
   */
  static getStub(obj, methodName, fakeMethod) {
    const stub = sinon.stub(obj, methodName);
    stub.callsFake(fakeMethod);
    return stub;
  }

  /**
   * Get the stub for object and method with resolved promise
   * @param {Object} obj the object needs to be stubbed
   * @param {String} methodName
   * @param {Object} resolvedObj object for resolved promise
   */
  static getStubForObjectWithResolvedPromise(obj, methodName, resolvedObj = undefined) {
    return Stub.getStub(obj, methodName, () => Promise.resolve(resolvedObj));
  }

  /**
   * Get the stub for object and method with rejected promise
   * @param {Object} obj the object needs to be stubbed
   * @param {String} methodName
   * @param {Object} rejectObj object for resolved promise
   */
  static getStubForObjectWithRejectedPromise(obj, methodName, rejectObj = undefined) {
    return Stub.getStub(obj, methodName, () => Promise.reject(rejectObj));
  }

  /**
   * Get the stub for object and method with returning object
   * @param {Object} obj the object needs to be stubbed
   * @param {String} methodName
   * @param {Object} retObject returned object for the stubbed method
   */
  static getStubForOperatorWithObject(obj, methodName, retObject) {
    return this.getStub(obj, methodName, () => retObject);
  }

  /**
   * restore the stub of sinon
   * @param {stub | spy | mock} sinonObj
   */
  static restore(sinonObj) {
    if (sinonObj != null) {
      sinonObj.restore();
    }
  }

  /**
   * get the rejected error message
   * @return {string} error message
   */
  static get rejectErrorMessage() {
    return 'some-error-occurred';
  }

  /**
   * get the resolved message
   * @return {string} resolved message
   */
  static get resolvedMessage() {
    return 'done-without-error';
  }
}
exports = module.exports = Stub;
