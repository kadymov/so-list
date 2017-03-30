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