class Utils {
  static registerEventForLoging(pool) {
    const eventEmitter = pool.eventEmitter;
    const myEventHandler = function (event) {
      console.log(event);
    };

    const myEventHandlerError = function (event) {
      console.error(event);
    };

    const myEventHandlerCreateError = function (event) {
      console.error('connectionCreateError', event);
    };

    const myEventHandlerValidateError = function (event) {
      console.error('connectionValidationError', event);
    };

    eventEmitter.on('poolDebug', myEventHandler);
    eventEmitter.on('poolError', myEventHandlerError);
    eventEmitter.on('connectionCreateError', myEventHandlerCreateError);
    eventEmitter.on('connectionValidationError', myEventHandlerValidateError);
  }
}
exports = module.exports = Utils;
