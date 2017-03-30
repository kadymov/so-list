module.exports = {
    tmpl:   '<div class="question-row" data-question-id="{{ __id }}">' +
                '<div class="question-col author">{{ owner.display_name }}</div>' + 
                '<div class="question-col title">{{ title }}</div>' + 
                '<div class="question-col title">{{ creation_date }}</div>' +
            '</div>'
};