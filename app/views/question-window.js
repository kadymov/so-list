const Utils = require('../other/utils');
const questionWindowTemplate = require('../templates/question-window-tmpl').tmpl;

/**
 * @constructor
 */
let QuestionWindow = function(model) {
    let self = this;
    
    this._model = model || {};
    this._el = document.createElement('div');
    this._el.className = 'question-window';

    Object.defineProperty(this, 'model', {
        get: function() {
            return self._model;
        },
        set: function(value) {
            self._model = value;
            self._update();
            self._setVisibility(true);
        }
    });
    
    this._setVisibility(false);
    
    this._el.addEventListener('click', function(e) {
        e.stopPropagation();
        if (e.target.className === 'question-window') {
            self._setVisibility(false);
        }
    })
};

/**
 * @public
 * @param container {Element}
 */
QuestionWindow.prototype.appendTo = function(container) {
    container.appendChild(this._el);
    this._update();
};

/**
 * @private
 */
QuestionWindow.prototype._setVisibility = function(isVisible) {
    this._el.style.display = isVisible ? 'block' : 'none';
};

/**
 * @private
 */
QuestionWindow.prototype._update = function() {
    this._el.innerHTML = Utils.template(this.model, questionWindowTemplate);
};

module.exports = QuestionWindow;