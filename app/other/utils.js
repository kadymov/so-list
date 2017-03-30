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
