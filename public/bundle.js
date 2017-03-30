(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
const Utils = require('./other/utils');
const QuestionsModel = require('./models/questions');
const QuestionsList = require('./views/questions-list');
const QuestionWindow = require('./views/question-window');

const questionModel = new QuestionsModel();
const listView = new QuestionsList(questionModel);
const questionWindow = new QuestionWindow();

listView.appendTo(document.body);
questionWindow.appendTo(document.body);

listView.addClickListener(function(e) {
    let row = Utils.closest(e.target, '.question-row');
    if (!row) return;
    
    let selectedId = parseInt(row.getAttribute('data-question-id'), 10);

    questionWindow.model = questionModel.get(selectedId);
});
},{"./models/questions":2,"./other/utils":4,"./views/question-window":8,"./views/questions-list":9}],2:[function(require,module,exports){
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
},{"../other/stack-api":3}],3:[function(require,module,exports){
const Utils = require('./utils');
   
let StackApi = {};
const SO_URL = 'https://api.stackexchange.com/2.2';
    
/**
 * @public
 * @param page {Number}
 * @param pageSize {Number}
 * @return {Promise}
 */
StackApi.getQuestions = function(page, pageSize) {
    return Utils.ajax(SO_URL + '/questions', {
       'page': page,
       'pagesize': pageSize,
       'order': 'desc',
       'sort': 'creation',
       'site': 'stackoverflow'
    }).then(function(data) {
        if (data.items) {
            return Promise.resolve(data.items);
        } else {
            return Promise.reject(data.error_message);
        }
    });
};


module.exports = StackApi;
},{"./utils":4}],4:[function(require,module,exports){
let Utils = {};

let XHR = ("onload" in new XMLHttpRequest()) 
    ? XMLHttpRequest 
    : XDomainRequest;
    
let requestsCache = {};

/**
 * @param params {Object}
 */
Utils.compileParams = function(params) {
    let paramsArray = [];
    params = params || {};
    
    for (let pName in params) if (params.hasOwnProperty(pName)) {
        paramsArray.push(pName + '=' + params[pName]);
    }
    
    return paramsArray.join('&')
};

/**
 * @param url {String}
 * @param params {Object}
 */
Utils.ajax = function(url, params) {
    url = url + '?' + Utils.compileParams(params);
    
    if (requestsCache[url]) {
        return Promise.resolve(requestsCache[url]);
    }
    
    return new Promise(function(resolve, reject) {
        let xhr = new XHR();
        xhr.open('GET', url, true);
        
        xhr.onload = function() {
            try {
                let obj = JSON.parse(this.responseText);
                
                requestsCache[url] = obj
                resolve(obj);
            } catch(e) {
                reject(e);
            }
        };
        
        xhr.onerror = function() {
          reject(this.status);
        };
        
        xhr.send();
    });
    
};

Utils.debounce = function(fn, timeout, context) {
    let timer;
    
    return function() {
        let args = arguments;
        
        clearTimeout(timer);
        timer = setTimeout(function() {
            fn.apply(context, args);
        }, timeout);
    };
};

Utils.get = function(obj, paramStr) {
    return paramStr.split('.').reduce(function(obj, currentValue) {
        let val = obj && obj[currentValue.trim()];
        return (typeof val !== 'undefined') ? val : null;
    }, obj);
};

Utils.template = function(item, template) {
    return template.replace(/{{([^}]+)}}/g, function(str, param) {
        return Utils.get(item, param);
    });
}

Utils.formatDate = function(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    let strTime = hours + ':' + minutes + ' ' + ampm;
    return date.getMonth() + 1 + '.' + date.getDate() + '.' + date.getFullYear() + '  ' + strTime;
}

Utils.closest = function(curEl, selector) {
    let i, len;

    while(curEl !== document) {
        if (curEl.nodeType < 11 && curEl.matches(selector)) {
            return curEl;
        }
        curEl = curEl.parentNode;
    }
    return null;
};

module.exports = Utils;

},{}],5:[function(require,module,exports){
/**
 * @constructor
 * @param options.items {Array}
 * @param options.itemHeight {Number}
 * @param options.bufferLength {Number}
 * @param options.renderFn {Function}
 * @param options.className {String}
 * @param options.onScroll {Function}
 */
let VirtualScroll = function(options) {
  options = options || {};

  this.items = options.items || [];

  this._itemHeight = options.itemHeight || 25;
  this._bufferLength = options.bufferLength || 2;
  this._renderFn = options.renderFn || function() {
    return document.createElement('div');
  };
  this._className = options.className || 'virtual-scroll';
  this._onScrollFn = options.onScroll || function() {};

  this._init();
};

let fn = VirtualScroll.prototype;

/******************************** Public **********************************/

/**
 * @public
 * @param container {Element}
 */
fn.appendTo = function(container) {
  container.appendChild(this._el);
  this.updateElements();
};

/**
 * @public
 * @return {Object}
 */
fn.getScroll = function() {
  return {
    top: this._el.scrollTop,
    bottom: this._el.scrollTop + this._el.clientHeight
  };
};

/**
 * @public
 * @return {Number}
 */
fn.scrollHeight = function() {
  return this._el.scrollHeight;
};

/**
 * @public
 */
fn.addClickListener = function(fn) {
  return this._el.addEventListener('click', fn);
};

/**
 * @public
 */
fn.updateElements = function() {
  let items = this.items;
  let scroll = this.getScroll();
  let itemHeight = this._itemHeight;
  let bufferLength = this._bufferLength;

  let startIndex = Math.floor(scroll.top / itemHeight) - bufferLength;
  let endIndex = Math.ceil(scroll.bottom / itemHeight) + bufferLength;

  if (startIndex < 0) startIndex = 0;
  if (endIndex > items.length) endIndex = items.length;

  this._container.style.height = items.length * itemHeight + 'px';

  if (this._startIndex !== startIndex || this._endIndex !== endIndex) { 
    this._render(startIndex, endIndex);
    this._startIndex = startIndex;
    this._endIndex = endIndex;
  }
};

/******************************* Private **********************************/

/**
 * @private
 */
fn._init = function(options) {
  this._pool = [];
  this._startIndex = -1;
  this._endIndex = -1;

  this._el = document.createElement('div');
  this._el.className = this._className;

  this._container = document.createElement('div');
  this._container.style.position = 'relative';
  this._el.appendChild(this._container);

  this._el.addEventListener('scroll', function() {
    this.updateElements.call(this);
    this._onScrollFn();
  }.bind(this));
};

/**
 * @private
 */
fn._render = function(startIndex, endIndex) {
  let pool = this._pool;
  let items = this.items;
  let renderFn = this._renderFn;
  let itemHeight = this._itemHeight;
  let elements = document.createDocumentFragment();

  for (let i = startIndex; i < endIndex; i++) {
    let el = pool[i];

    if (!el) {
      pool[i] = el = renderFn(items[i], i);
    }

    elements.appendChild(el);

    el.style.position = 'absolute';
    el.style.top = (i * itemHeight) + 'px';
    el.style.height = itemHeight + 'px';
  }

  this._container.innerHTML = '';
  this._container.appendChild(elements);
};


module.exports = VirtualScroll;
},{}],6:[function(require,module,exports){
module.exports = {
    tmpl:   '<div class="question-row" data-question-id="{{ __id }}">' +
                '<div class="question-col author">{{ owner.display_name }}</div>' + 
                '<div class="question-col title">{{ title }}</div>' + 
                '<div class="question-col title">{{ creation_date }}</div>' +
            '</div>'
};
},{}],7:[function(require,module,exports){
module.exports = {
    tmpl: '<div class="question-window-panel"><a href="{{ link }}" target="_blank">{{title}}</a></div>'
};
},{}],8:[function(require,module,exports){
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
},{"../other/utils":4,"../templates/question-window-tmpl":7}],9:[function(require,module,exports){
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
},{"../other/utils":4,"../other/virtual-scroll":5,"../templates/question-list-item-tmpl":6}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvbWFpbi5qcyIsImFwcC9tb2RlbHMvcXVlc3Rpb25zLmpzIiwiYXBwL290aGVyL3N0YWNrLWFwaS5qcyIsImFwcC9vdGhlci91dGlscy5qcyIsImFwcC9vdGhlci92aXJ0dWFsLXNjcm9sbC5qcyIsImFwcC90ZW1wbGF0ZXMvcXVlc3Rpb24tbGlzdC1pdGVtLXRtcGwuanMiLCJhcHAvdGVtcGxhdGVzL3F1ZXN0aW9uLXdpbmRvdy10bXBsLmpzIiwiYXBwL3ZpZXdzL3F1ZXN0aW9uLXdpbmRvdy5qcyIsImFwcC92aWV3cy9xdWVzdGlvbnMtbGlzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vb3RoZXIvdXRpbHMnKTtcbmNvbnN0IFF1ZXN0aW9uc01vZGVsID0gcmVxdWlyZSgnLi9tb2RlbHMvcXVlc3Rpb25zJyk7XG5jb25zdCBRdWVzdGlvbnNMaXN0ID0gcmVxdWlyZSgnLi92aWV3cy9xdWVzdGlvbnMtbGlzdCcpO1xuY29uc3QgUXVlc3Rpb25XaW5kb3cgPSByZXF1aXJlKCcuL3ZpZXdzL3F1ZXN0aW9uLXdpbmRvdycpO1xuXG5jb25zdCBxdWVzdGlvbk1vZGVsID0gbmV3IFF1ZXN0aW9uc01vZGVsKCk7XG5jb25zdCBsaXN0VmlldyA9IG5ldyBRdWVzdGlvbnNMaXN0KHF1ZXN0aW9uTW9kZWwpO1xuY29uc3QgcXVlc3Rpb25XaW5kb3cgPSBuZXcgUXVlc3Rpb25XaW5kb3coKTtcblxubGlzdFZpZXcuYXBwZW5kVG8oZG9jdW1lbnQuYm9keSk7XG5xdWVzdGlvbldpbmRvdy5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KTtcblxubGlzdFZpZXcuYWRkQ2xpY2tMaXN0ZW5lcihmdW5jdGlvbihlKSB7XG4gICAgbGV0IHJvdyA9IFV0aWxzLmNsb3Nlc3QoZS50YXJnZXQsICcucXVlc3Rpb24tcm93Jyk7XG4gICAgaWYgKCFyb3cpIHJldHVybjtcbiAgICBcbiAgICBsZXQgc2VsZWN0ZWRJZCA9IHBhcnNlSW50KHJvdy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcXVlc3Rpb24taWQnKSwgMTApO1xuXG4gICAgcXVlc3Rpb25XaW5kb3cubW9kZWwgPSBxdWVzdGlvbk1vZGVsLmdldChzZWxlY3RlZElkKTtcbn0pOyIsImNvbnN0IFN0YWNrQXBpID0gcmVxdWlyZSgnLi4vb3RoZXIvc3RhY2stYXBpJyk7XG5cbi8qKlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbmxldCBRdWVzdGlvbnNNb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2RhdGEgPSBbXTtcbiAgICB0aGlzLl9vYnNlcnZlcnMgPSBbXTtcbn07XG5cbi8qKlxuICogQHB1YmxpY1xuICovXG5RdWVzdGlvbnNNb2RlbC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZGF0YVtpZF07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RhdGE7XG4gICAgfVxufTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAcGFyYW0gY291bnQge051bWJlcn1cbiAqL1xuUXVlc3Rpb25zTW9kZWwucHJvdG90eXBlLmdldE5RdWVzdGlvbnMgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIFN0YWNrQXBpLmdldFF1ZXN0aW9ucyh0aGlzLl9kYXRhLmxlbmd0aCArIDEsIGNvdW50KVxuICAgICAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEgPSB0aGlzLl9kYXRhLmNvbmNhdChyZXN1bHQpO1xuICAgICAgICAgICAgdGhpcy5fbm90aWZ5KCk7XG4gICAgICAgIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoZXJyb3IpO1xuICAgICAgICB9KTtcbn07XG5cbi8qKlxuICogQHB1YmxpY1xuICogQHBhcmFtIGNvdW50IHtOdW1iZXJ9XG4gKi9cblF1ZXN0aW9uc01vZGVsLnByb3RvdHlwZS5hZGRPYnNlcnZlciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdGhpcy5fb2JzZXJ2ZXJzLnB1c2goZm4pO1xufTtcblxuUXVlc3Rpb25zTW9kZWwucHJvdG90eXBlLl9ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9vYnNlcnZlcnMuZm9yRWFjaCgoZm4pID0+IHsgZm4oKSB9KTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbnNNb2RlbDsiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbiAgIFxubGV0IFN0YWNrQXBpID0ge307XG5jb25zdCBTT19VUkwgPSAnaHR0cHM6Ly9hcGkuc3RhY2tleGNoYW5nZS5jb20vMi4yJztcbiAgICBcbi8qKlxuICogQHB1YmxpY1xuICogQHBhcmFtIHBhZ2Uge051bWJlcn1cbiAqIEBwYXJhbSBwYWdlU2l6ZSB7TnVtYmVyfVxuICogQHJldHVybiB7UHJvbWlzZX1cbiAqL1xuU3RhY2tBcGkuZ2V0UXVlc3Rpb25zID0gZnVuY3Rpb24ocGFnZSwgcGFnZVNpemUpIHtcbiAgICByZXR1cm4gVXRpbHMuYWpheChTT19VUkwgKyAnL3F1ZXN0aW9ucycsIHtcbiAgICAgICAncGFnZSc6IHBhZ2UsXG4gICAgICAgJ3BhZ2VzaXplJzogcGFnZVNpemUsXG4gICAgICAgJ29yZGVyJzogJ2Rlc2MnLFxuICAgICAgICdzb3J0JzogJ2NyZWF0aW9uJyxcbiAgICAgICAnc2l0ZSc6ICdzdGFja292ZXJmbG93J1xuICAgIH0pLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5pdGVtcykge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShkYXRhLml0ZW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChkYXRhLmVycm9yX21lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gU3RhY2tBcGk7IiwibGV0IFV0aWxzID0ge307XG5cbmxldCBYSFIgPSAoXCJvbmxvYWRcIiBpbiBuZXcgWE1MSHR0cFJlcXVlc3QoKSkgXG4gICAgPyBYTUxIdHRwUmVxdWVzdCBcbiAgICA6IFhEb21haW5SZXF1ZXN0O1xuICAgIFxubGV0IHJlcXVlc3RzQ2FjaGUgPSB7fTtcblxuLyoqXG4gKiBAcGFyYW0gcGFyYW1zIHtPYmplY3R9XG4gKi9cblV0aWxzLmNvbXBpbGVQYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICBsZXQgcGFyYW1zQXJyYXkgPSBbXTtcbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgXG4gICAgZm9yIChsZXQgcE5hbWUgaW4gcGFyYW1zKSBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KHBOYW1lKSkge1xuICAgICAgICBwYXJhbXNBcnJheS5wdXNoKHBOYW1lICsgJz0nICsgcGFyYW1zW3BOYW1lXSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBwYXJhbXNBcnJheS5qb2luKCcmJylcbn07XG5cbi8qKlxuICogQHBhcmFtIHVybCB7U3RyaW5nfVxuICogQHBhcmFtIHBhcmFtcyB7T2JqZWN0fVxuICovXG5VdGlscy5hamF4ID0gZnVuY3Rpb24odXJsLCBwYXJhbXMpIHtcbiAgICB1cmwgPSB1cmwgKyAnPycgKyBVdGlscy5jb21waWxlUGFyYW1zKHBhcmFtcyk7XG4gICAgXG4gICAgaWYgKHJlcXVlc3RzQ2FjaGVbdXJsXSkge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlcXVlc3RzQ2FjaGVbdXJsXSk7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgbGV0IHhociA9IG5ldyBYSFIoKTtcbiAgICAgICAgeGhyLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCBvYmogPSBKU09OLnBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXF1ZXN0c0NhY2hlW3VybF0gPSBvYmpcbiAgICAgICAgICAgICAgICByZXNvbHZlKG9iaik7XG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJlamVjdCh0aGlzLnN0YXR1cyk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB4aHIuc2VuZCgpO1xuICAgIH0pO1xuICAgIFxufTtcblxuVXRpbHMuZGVib3VuY2UgPSBmdW5jdGlvbihmbiwgdGltZW91dCwgY29udGV4dCkge1xuICAgIGxldCB0aW1lcjtcbiAgICBcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICBcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm4uYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIH0sIHRpbWVvdXQpO1xuICAgIH07XG59O1xuXG5VdGlscy5nZXQgPSBmdW5jdGlvbihvYmosIHBhcmFtU3RyKSB7XG4gICAgcmV0dXJuIHBhcmFtU3RyLnNwbGl0KCcuJykucmVkdWNlKGZ1bmN0aW9uKG9iaiwgY3VycmVudFZhbHVlKSB7XG4gICAgICAgIGxldCB2YWwgPSBvYmogJiYgb2JqW2N1cnJlbnRWYWx1ZS50cmltKCldO1xuICAgICAgICByZXR1cm4gKHR5cGVvZiB2YWwgIT09ICd1bmRlZmluZWQnKSA/IHZhbCA6IG51bGw7XG4gICAgfSwgb2JqKTtcbn07XG5cblV0aWxzLnRlbXBsYXRlID0gZnVuY3Rpb24oaXRlbSwgdGVtcGxhdGUpIHtcbiAgICByZXR1cm4gdGVtcGxhdGUucmVwbGFjZSgve3soW159XSspfX0vZywgZnVuY3Rpb24oc3RyLCBwYXJhbSkge1xuICAgICAgICByZXR1cm4gVXRpbHMuZ2V0KGl0ZW0sIHBhcmFtKTtcbiAgICB9KTtcbn1cblxuVXRpbHMuZm9ybWF0RGF0ZSA9IGZ1bmN0aW9uKGRhdGUpIHtcbiAgICBsZXQgaG91cnMgPSBkYXRlLmdldEhvdXJzKCk7XG4gICAgbGV0IG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKTtcbiAgICBsZXQgYW1wbSA9IGhvdXJzID49IDEyID8gJ3BtJyA6ICdhbSc7XG4gICAgaG91cnMgPSBob3VycyAlIDEyO1xuICAgIGhvdXJzID0gaG91cnMgPyBob3VycyA6IDEyOyAvLyB0aGUgaG91ciAnMCcgc2hvdWxkIGJlICcxMidcbiAgICBtaW51dGVzID0gbWludXRlcyA8IDEwID8gJzAnK21pbnV0ZXMgOiBtaW51dGVzO1xuICAgIGxldCBzdHJUaW1lID0gaG91cnMgKyAnOicgKyBtaW51dGVzICsgJyAnICsgYW1wbTtcbiAgICByZXR1cm4gZGF0ZS5nZXRNb250aCgpICsgMSArICcuJyArIGRhdGUuZ2V0RGF0ZSgpICsgJy4nICsgZGF0ZS5nZXRGdWxsWWVhcigpICsgJyAgJyArIHN0clRpbWU7XG59XG5cblV0aWxzLmNsb3Nlc3QgPSBmdW5jdGlvbihjdXJFbCwgc2VsZWN0b3IpIHtcbiAgICBsZXQgaSwgbGVuO1xuXG4gICAgd2hpbGUoY3VyRWwgIT09IGRvY3VtZW50KSB7XG4gICAgICAgIGlmIChjdXJFbC5ub2RlVHlwZSA8IDExICYmIGN1ckVsLm1hdGNoZXMoc2VsZWN0b3IpKSB7XG4gICAgICAgICAgICByZXR1cm4gY3VyRWw7XG4gICAgICAgIH1cbiAgICAgICAgY3VyRWwgPSBjdXJFbC5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7XG4iLCIvKipcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIG9wdGlvbnMuaXRlbXMge0FycmF5fVxuICogQHBhcmFtIG9wdGlvbnMuaXRlbUhlaWdodCB7TnVtYmVyfVxuICogQHBhcmFtIG9wdGlvbnMuYnVmZmVyTGVuZ3RoIHtOdW1iZXJ9XG4gKiBAcGFyYW0gb3B0aW9ucy5yZW5kZXJGbiB7RnVuY3Rpb259XG4gKiBAcGFyYW0gb3B0aW9ucy5jbGFzc05hbWUge1N0cmluZ31cbiAqIEBwYXJhbSBvcHRpb25zLm9uU2Nyb2xsIHtGdW5jdGlvbn1cbiAqL1xubGV0IFZpcnR1YWxTY3JvbGwgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHRoaXMuaXRlbXMgPSBvcHRpb25zLml0ZW1zIHx8IFtdO1xuXG4gIHRoaXMuX2l0ZW1IZWlnaHQgPSBvcHRpb25zLml0ZW1IZWlnaHQgfHwgMjU7XG4gIHRoaXMuX2J1ZmZlckxlbmd0aCA9IG9wdGlvbnMuYnVmZmVyTGVuZ3RoIHx8IDI7XG4gIHRoaXMuX3JlbmRlckZuID0gb3B0aW9ucy5yZW5kZXJGbiB8fCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIH07XG4gIHRoaXMuX2NsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lIHx8ICd2aXJ0dWFsLXNjcm9sbCc7XG4gIHRoaXMuX29uU2Nyb2xsRm4gPSBvcHRpb25zLm9uU2Nyb2xsIHx8IGZ1bmN0aW9uKCkge307XG5cbiAgdGhpcy5faW5pdCgpO1xufTtcblxubGV0IGZuID0gVmlydHVhbFNjcm9sbC5wcm90b3R5cGU7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiBQdWJsaWMgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLyoqXG4gKiBAcHVibGljXG4gKiBAcGFyYW0gY29udGFpbmVyIHtFbGVtZW50fVxuICovXG5mbi5hcHBlbmRUbyA9IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5fZWwpO1xuICB0aGlzLnVwZGF0ZUVsZW1lbnRzKCk7XG59O1xuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuZm4uZ2V0U2Nyb2xsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgdG9wOiB0aGlzLl9lbC5zY3JvbGxUb3AsXG4gICAgYm90dG9tOiB0aGlzLl9lbC5zY3JvbGxUb3AgKyB0aGlzLl9lbC5jbGllbnRIZWlnaHRcbiAgfTtcbn07XG5cbi8qKlxuICogQHB1YmxpY1xuICogQHJldHVybiB7TnVtYmVyfVxuICovXG5mbi5zY3JvbGxIZWlnaHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX2VsLnNjcm9sbEhlaWdodDtcbn07XG5cbi8qKlxuICogQHB1YmxpY1xuICovXG5mbi5hZGRDbGlja0xpc3RlbmVyID0gZnVuY3Rpb24oZm4pIHtcbiAgcmV0dXJuIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZm4pO1xufTtcblxuLyoqXG4gKiBAcHVibGljXG4gKi9cbmZuLnVwZGF0ZUVsZW1lbnRzID0gZnVuY3Rpb24oKSB7XG4gIGxldCBpdGVtcyA9IHRoaXMuaXRlbXM7XG4gIGxldCBzY3JvbGwgPSB0aGlzLmdldFNjcm9sbCgpO1xuICBsZXQgaXRlbUhlaWdodCA9IHRoaXMuX2l0ZW1IZWlnaHQ7XG4gIGxldCBidWZmZXJMZW5ndGggPSB0aGlzLl9idWZmZXJMZW5ndGg7XG5cbiAgbGV0IHN0YXJ0SW5kZXggPSBNYXRoLmZsb29yKHNjcm9sbC50b3AgLyBpdGVtSGVpZ2h0KSAtIGJ1ZmZlckxlbmd0aDtcbiAgbGV0IGVuZEluZGV4ID0gTWF0aC5jZWlsKHNjcm9sbC5ib3R0b20gLyBpdGVtSGVpZ2h0KSArIGJ1ZmZlckxlbmd0aDtcblxuICBpZiAoc3RhcnRJbmRleCA8IDApIHN0YXJ0SW5kZXggPSAwO1xuICBpZiAoZW5kSW5kZXggPiBpdGVtcy5sZW5ndGgpIGVuZEluZGV4ID0gaXRlbXMubGVuZ3RoO1xuXG4gIHRoaXMuX2NvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBpdGVtcy5sZW5ndGggKiBpdGVtSGVpZ2h0ICsgJ3B4JztcblxuICBpZiAodGhpcy5fc3RhcnRJbmRleCAhPT0gc3RhcnRJbmRleCB8fCB0aGlzLl9lbmRJbmRleCAhPT0gZW5kSW5kZXgpIHsgXG4gICAgdGhpcy5fcmVuZGVyKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcbiAgICB0aGlzLl9zdGFydEluZGV4ID0gc3RhcnRJbmRleDtcbiAgICB0aGlzLl9lbmRJbmRleCA9IGVuZEluZGV4O1xuICB9XG59O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiBQcml2YXRlICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuZm4uX2luaXQgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHRoaXMuX3Bvb2wgPSBbXTtcbiAgdGhpcy5fc3RhcnRJbmRleCA9IC0xO1xuICB0aGlzLl9lbmRJbmRleCA9IC0xO1xuXG4gIHRoaXMuX2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHRoaXMuX2VsLmNsYXNzTmFtZSA9IHRoaXMuX2NsYXNzTmFtZTtcblxuICB0aGlzLl9jb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdGhpcy5fY29udGFpbmVyLnN0eWxlLnBvc2l0aW9uID0gJ3JlbGF0aXZlJztcbiAgdGhpcy5fZWwuYXBwZW5kQ2hpbGQodGhpcy5fY29udGFpbmVyKTtcblxuICB0aGlzLl9lbC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnVwZGF0ZUVsZW1lbnRzLmNhbGwodGhpcyk7XG4gICAgdGhpcy5fb25TY3JvbGxGbigpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5mbi5fcmVuZGVyID0gZnVuY3Rpb24oc3RhcnRJbmRleCwgZW5kSW5kZXgpIHtcbiAgbGV0IHBvb2wgPSB0aGlzLl9wb29sO1xuICBsZXQgaXRlbXMgPSB0aGlzLml0ZW1zO1xuICBsZXQgcmVuZGVyRm4gPSB0aGlzLl9yZW5kZXJGbjtcbiAgbGV0IGl0ZW1IZWlnaHQgPSB0aGlzLl9pdGVtSGVpZ2h0O1xuICBsZXQgZWxlbWVudHMgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cbiAgZm9yIChsZXQgaSA9IHN0YXJ0SW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XG4gICAgbGV0IGVsID0gcG9vbFtpXTtcblxuICAgIGlmICghZWwpIHtcbiAgICAgIHBvb2xbaV0gPSBlbCA9IHJlbmRlckZuKGl0ZW1zW2ldLCBpKTtcbiAgICB9XG5cbiAgICBlbGVtZW50cy5hcHBlbmRDaGlsZChlbCk7XG5cbiAgICBlbC5zdHlsZS5wb3NpdGlvbiA9ICdhYnNvbHV0ZSc7XG4gICAgZWwuc3R5bGUudG9wID0gKGkgKiBpdGVtSGVpZ2h0KSArICdweCc7XG4gICAgZWwuc3R5bGUuaGVpZ2h0ID0gaXRlbUhlaWdodCArICdweCc7XG4gIH1cblxuICB0aGlzLl9jb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gIHRoaXMuX2NvbnRhaW5lci5hcHBlbmRDaGlsZChlbGVtZW50cyk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFNjcm9sbDsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICB0bXBsOiAgICc8ZGl2IGNsYXNzPVwicXVlc3Rpb24tcm93XCIgZGF0YS1xdWVzdGlvbi1pZD1cInt7IF9faWQgfX1cIj4nICtcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInF1ZXN0aW9uLWNvbCBhdXRob3JcIj57eyBvd25lci5kaXNwbGF5X25hbWUgfX08L2Rpdj4nICsgXG4gICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJxdWVzdGlvbi1jb2wgdGl0bGVcIj57eyB0aXRsZSB9fTwvZGl2PicgKyBcbiAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInF1ZXN0aW9uLWNvbCB0aXRsZVwiPnt7IGNyZWF0aW9uX2RhdGUgfX08L2Rpdj4nICtcbiAgICAgICAgICAgICc8L2Rpdj4nXG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHRtcGw6ICc8ZGl2IGNsYXNzPVwicXVlc3Rpb24td2luZG93LXBhbmVsXCI+PGEgaHJlZj1cInt7IGxpbmsgfX1cIiB0YXJnZXQ9XCJfYmxhbmtcIj57e3RpdGxlfX08L2E+PC9kaXY+J1xufTsiLCJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4uL290aGVyL3V0aWxzJyk7XG5jb25zdCBxdWVzdGlvbldpbmRvd1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3F1ZXN0aW9uLXdpbmRvdy10bXBsJykudG1wbDtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubGV0IFF1ZXN0aW9uV2luZG93ID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgICBsZXQgc2VsZiA9IHRoaXM7XG4gICAgXG4gICAgdGhpcy5fbW9kZWwgPSBtb2RlbCB8fCB7fTtcbiAgICB0aGlzLl9lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX2VsLmNsYXNzTmFtZSA9ICdxdWVzdGlvbi13aW5kb3cnO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdtb2RlbCcsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBzZWxmLl9tb2RlbDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgc2VsZi5fbW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICAgIHNlbGYuX3VwZGF0ZSgpO1xuICAgICAgICAgICAgc2VsZi5fc2V0VmlzaWJpbGl0eSh0cnVlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIFxuICAgIHRoaXMuX3NldFZpc2liaWxpdHkoZmFsc2UpO1xuICAgIFxuICAgIHRoaXMuX2VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBpZiAoZS50YXJnZXQuY2xhc3NOYW1lID09PSAncXVlc3Rpb24td2luZG93Jykge1xuICAgICAgICAgICAgc2VsZi5fc2V0VmlzaWJpbGl0eShmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9KVxufTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAcGFyYW0gY29udGFpbmVyIHtFbGVtZW50fVxuICovXG5RdWVzdGlvbldpbmRvdy5wcm90b3R5cGUuYXBwZW5kVG8gPSBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5fZWwpO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5RdWVzdGlvbldpbmRvdy5wcm90b3R5cGUuX3NldFZpc2liaWxpdHkgPSBmdW5jdGlvbihpc1Zpc2libGUpIHtcbiAgICB0aGlzLl9lbC5zdHlsZS5kaXNwbGF5ID0gaXNWaXNpYmxlID8gJ2Jsb2NrJyA6ICdub25lJztcbn07XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuUXVlc3Rpb25XaW5kb3cucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbC5pbm5lckhUTUwgPSBVdGlscy50ZW1wbGF0ZSh0aGlzLm1vZGVsLCBxdWVzdGlvbldpbmRvd1RlbXBsYXRlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlc3Rpb25XaW5kb3c7IiwiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuLi9vdGhlci91dGlscycpO1xuY29uc3QgVmlydHVhbFNjcm9sbCA9IHJlcXVpcmUoJy4uL290aGVyL3ZpcnR1YWwtc2Nyb2xsJyk7XG5jb25zdCBxdWVzdGlvbkxpc3RJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvcXVlc3Rpb24tbGlzdC1pdGVtLXRtcGwnKTtcblxuY29uc3QgSVRFTV9IRUlHSFQgPSA1MDtcbmNvbnN0IFFVRVNUSU9OU19JTkMgPSAxMDtcblxuLyoqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xubGV0IFF1ZXN0aW9uc0xpc3QgPSBmdW5jdGlvbihtb2RlbCkge1xuICAgIFxuICAgIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gICAgdGhpcy5fbW9kZWwuYWRkT2JzZXJ2ZXIodGhpcy5fb25Nb2RlbENoYW5nZS5iaW5kKHRoaXMpKTtcbiAgICBcbiAgICB0aGlzLl92aXJ0dWFsU2Nyb2xsID0gbmV3IFZpcnR1YWxTY3JvbGwoe1xuICAgICAgICBpdGVtSGVpZ2h0OiBJVEVNX0hFSUdIVCxcbiAgICAgICAgcmVuZGVyRm46IGZ1bmN0aW9uKGl0ZW0sIGlkKSB7XG4gICAgICAgICAgICBsZXQgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaXRlbS5fX2lkID0gaWQ7XG4gICAgICAgICAgICBpdGVtLmNyZWF0aW9uX2RhdGUgPSBVdGlscy5mb3JtYXREYXRlKG5ldyBEYXRlKGl0ZW0uY3JlYXRpb25fZGF0ZSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbC5jbGFzc05hbWUgPSAnbGlzdC1pdGVtJztcbiAgICAgICAgICAgIGVsLmlubmVySFRNTCA9IFV0aWxzLnRlbXBsYXRlKGl0ZW0sIHF1ZXN0aW9uTGlzdEl0ZW1UZW1wbGF0ZS50bXBsKTtcbiAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIG9uU2Nyb2xsOiB0aGlzLl9vbkxpc3RTY3JvbGwuYmluZCh0aGlzKVxuICAgIH0pO1xufTtcblxuLyoqXG4gKiBAcHVibGljXG4gKi9cblF1ZXN0aW9uc0xpc3QucHJvdG90eXBlLmFwcGVuZFRvID0gZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gICAgdGhpcy5fdmlydHVhbFNjcm9sbC5hcHBlbmRUbyhjb250YWluZXIpO1xuICAgIHRoaXMuX21vZGVsLmdldE5RdWVzdGlvbnMoUVVFU1RJT05TX0lOQyk7XG59O1xuXG4vKipcbiAqIEBwdWJsaWNcbiAqL1xuUXVlc3Rpb25zTGlzdC5wcm90b3R5cGUuYWRkQ2xpY2tMaXN0ZW5lciA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgdGhpcy5fdmlydHVhbFNjcm9sbC5hZGRDbGlja0xpc3RlbmVyKGZuKTtcbn07XG5cbi8qKlxuICogQGV2ZW50XG4gKi9cblF1ZXN0aW9uc0xpc3QucHJvdG90eXBlLl9vbkxpc3RTY3JvbGwgPSBmdW5jdGlvbigpIHtcbiAgICBsZXQgbGlzdCA9IHRoaXMuX3ZpcnR1YWxTY3JvbGw7XG4gICAgXG4gICAgIGlmIChsaXN0LnNjcm9sbEhlaWdodCgpIC0gbGlzdC5nZXRTY3JvbGwoKS5ib3R0b20gPCBJVEVNX0hFSUdIVCkge1xuICAgICAgICAgdGhpcy5fbW9kZWwuZ2V0TlF1ZXN0aW9ucyhRVUVTVElPTlNfSU5DKTtcbiAgICAgfVxufTtcblxuLyoqXG4gKiBAZXZlbnRcbiAqL1xuUXVlc3Rpb25zTGlzdC5wcm90b3R5cGUuX29uTW9kZWxDaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl92aXJ0dWFsU2Nyb2xsLml0ZW1zID0gdGhpcy5fbW9kZWwuZ2V0KCk7XG4gICAgdGhpcy5fdmlydHVhbFNjcm9sbC51cGRhdGVFbGVtZW50cygpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbnNMaXN0OyJdfQ==
