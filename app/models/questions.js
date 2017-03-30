const StackApi = require('../other/stack-api');

/**
 * @constructor
 */
let QuestionsModel = function() {
    this._data = [];
    this._observers = [];
};

/**
 * @public
 */
QuestionsModel.prototype.get = function(id) {
    if (arguments.length) {
        return this._data[id];
    } else {
        return this._data;
    }
};

/**
 * @public
 * @param count {Number}
 */
QuestionsModel.prototype.getNQuestions = function(count) {
    StackApi.getQuestions(this._data.length + 1, count)
        .then(function(result) {
            this._data = this._data.concat(result);
            this._notify();
        }.bind(this), function(error) {
            console.debug(error);
        });
};

/**
 * @public
 * @param count {Number}
 */
QuestionsModel.prototype.addObserver = function(fn) {
    this._observers.push(fn);
};

QuestionsModel.prototype._notify = function() {
    this._observers.forEach((fn) => { fn() });
};


module.exports = QuestionsModel;