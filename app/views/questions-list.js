const Utils = require('../other/utils');
const VirtualScroll = require('../other/virtual-scroll');
const questionListItemTemplate = require('../templates/question-list-item-tmpl');

const ITEM_HEIGHT = 50;
const QUESTIONS_INC = 10;

/**
 * @constructor
 */
let QuestionsList = function(model) {
    
    this._model = model;
    this._model.addObserver(this._onModelChange.bind(this));
    
    this._virtualScroll = new VirtualScroll({
        itemHeight: ITEM_HEIGHT,
        renderFn: function(item, id) {
            let el = document.createElement('div');
            
            item.__id = id;
            item.creation_date = Utils.formatDate(new Date(item.creation_date));
            
            el.className = 'list-item';
            el.innerHTML = Utils.template(item, questionListItemTemplate.tmpl);
            return el;
        },
        
        onScroll: this._onListScroll.bind(this)
    });
};

/**
 * @public
 */
QuestionsList.prototype.appendTo = function(container) {
    this._virtualScroll.appendTo(container);
    this._model.getNQuestions(QUESTIONS_INC);
};

/**
 * @public
 */
QuestionsList.prototype.addClickListener = function(fn) {
    this._virtualScroll.addClickListener(fn);
};

/**
 * @event
 */
QuestionsList.prototype._onListScroll = function() {
    let list = this._virtualScroll;
    
     if (list.scrollHeight() - list.getScroll().bottom < ITEM_HEIGHT) {
         this._model.getNQuestions(QUESTIONS_INC);
     }
};

/**
 * @event
 */
QuestionsList.prototype._onModelChange = function() {
    this._virtualScroll.items = this._model.get();
    this._virtualScroll.updateElements();
};

module.exports = QuestionsList;