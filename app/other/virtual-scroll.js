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