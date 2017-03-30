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