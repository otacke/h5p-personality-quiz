export default class Sanitization {
  /**
   * Sanitize parameters.
   */
  sanitizeParameters() {
    // Personalities
    this.params.personalities = this.params.personalitiesGroup.personalities
      .reduce((results, personality) => {
        if (!personality.name || personality.name.length === 0) {
          return results;
        }

        // Can't use toLowerCase(), because this will be printed
        personality.name = personality.name.trim();

        if (results.some((result) => result.name === personality.name)) {
          return results; // Duplicate
        }

        return [...results, personality];
      }, []);
    delete this.params.personalitiesGroup;

    // answer-personalities-relation
    this.params.questions = this.params.questionsGroup.questions
      .map((question) => {
        question.answers = this.filterAnswers(question.answers);
        question.answers = question.answers.map((option) => {
          option.text = option.text ?? '\u3164';
          return option;
        });

        return question;
      })
      .filter((question) => question.answers.length !== 0);
    delete this.params.questionsGroup;
  }

  /**
   * Filter answers to only keep valid answers.
   * @param {object[]} answers Answers.
   * @returns {object[]} Filtered answers.
   */
  filterAnswers(answers) {
    return answers
      .map((answer) => {
        answer.personality =
          this.sanitizeOptionPersonalities(answer.personality);
        return answer;
      })
      .filter((answer) => answer.personality !== '');
  }

  /**
   * Sanitize list of personalities of answer option.
   * @param {string} personalities Personalities.
   * @returns {string} Sanitized list of personalities of answer option.
   */
  sanitizeOptionPersonalities(personalities) {
    if (typeof personalities !== 'string') {
      return '';
    }

    return personalities
      .split(',')
      .map((personality) => {
        return this.sanitizePersonalityOption(personality);
      })
      .filter((personality) => personality !== null)
      .join(',');
  }

  /**
   * Sanitize personality option.
   * @param {string} value Personality name and potentially score.
   * @returns {string|null} Sanitized personality option or `null` on error.
   */
  sanitizePersonalityOption(value) {
    let name, score;
    if (value.match(/=[-+]?\d+$/)) {
      const segments = value.split('=');
      score = segments.pop();
      name = segments.join('=');
    }
    else {
      score = 1;
      name = value;
    }

    name = name.trim().toLowerCase();

    if (!this.isPersonalityNameValid(name)) {
      return null;
    }

    return `${name}=${score}`;
  }

  /**
   * Determine whether personality name is valid.
   * @param {string} value Personality name.
   * @returns {boolean} True if valid, else false.
   */
  isPersonalityNameValid(value) {
    return this.params.personalities
      .some((personality) => personality.name.toLowerCase() === value);
  }
}
