'use strict';

/**
 * @class
 * @private
 */
class Task {
  /**
   * Constructor of Task
   * @param {TaskType} type
   * @param {*} resource resource of task
   */
  constructor(type, resource = null) {
    /**
     * task type
     * @type {TaskType}
     * @private
     */
    this._type = type;

    /**
     * resource of the task
     * @private
     */
    this._resource = resource;
  }

  /**
   * task type
   * @return {TaskType}
   */
  get taskType() {
    return this._type;
  }

  /**
   * resource of the task
   * @return {*}
   */
  get resource() {
    return this._resource;
  }
}

module.exports = Task;
