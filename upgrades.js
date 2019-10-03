/** @namespace H5PUpgrades */
var H5PUpgrades = H5PUpgrades || {};

H5PUpgrades['H5P.PersonalityQuiz'] = (function () {
  return {
    1: {
      1: function (parameters, finished) {

        if (parameters && parameters.questions && Array.isArray(parameters.questions)) {
          parameters.questions.forEach(function (question) {
            question.weight = 1;

            if (question.answers && Array.isArray(question.answers)) {
              question.answers.forEach(function (answer) {
                answer.score = 1;
              });
            }
          });
        }

        finished(null, parameters);
      }
    }
  };
})();
