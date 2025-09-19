import Util from '@services/util.js';
import Panel from './panel/panel.js';
import ProgressBar from './progress-bar/progress-bar.js';
import './question-screen.scss';

export default class QuestionScreen {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {object[]} [params.questions] Question data.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onAnswerGiven] Callback on answer given.
   * @param {function} [callbacks.onCompleted] Callback when all is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      questions: [{}],
    }, params);

    this.callbacks = Util.extend({
      onAnswerGiven: () => {},
      onCompleted: () => {},
    }, callbacks);

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-question-screen');

    // Progressbar
    this.progressBar = new ProgressBar({
      valueMin: 1,
      valueMax: this.params.questions.length,
      baseColor: this.params.colorProgressBar,
      isAnimated: this.params.isAnimationOn,
      l10n: {
        currentOfTotal: this.params.dictionary.get('l10n.currentOfTotal'),
      },
      a11y: {
        progressbar: this.params.dictionary.get('a11y.progressBar'),
      },
    });
    if (!this.params.showProgressBar) {
      this.progressBar.hide();
    }

    this.dom.append(this.progressBar.getDOM());

    // Panels
    this.panels = this.params.questions.map((question, questionIndex) => {
      const panel = new Panel({
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        appearance: this.params.appearance,
        image: question.image,
        questionText: question.text,
        answerOptions: question.answers,
        animation: this.params.isAnimationOn,
      },
      {
        onAnswerGiven: (optionIndex) => {
          this.callbacks.onAnswerGiven({
            questionIndex: questionIndex,
            optionIndex: optionIndex,
          });
        },
        onCompleted: () => {
          this.handlePanelCompleted(questionIndex);
        },
      });

      panel.hide();

      return panel;
    });

    this.panelWrapper = document.createElement('div');
    this.panelWrapper.classList.add('h5p-personality-quiz-panel-wrapper');
    this.dom.append(this.panelWrapper);

    this.panels.forEach((panel) => {
      this.panelWrapper.append(panel.getDOM());
    });

    this.progressBar.setProgress(1);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {object[]} [params.answersGiven] Previously given answers.
   * @param {boolean} [params.focus] If true, set focus to relevant panel.
   */
  show(params = {}) {
    params = Util.extend({ answersGiven: [] }, params);

    const lastQuestionIndex = params.answersGiven.length;

    this.panels.forEach((panel, index) => {
      if (index === lastQuestionIndex) {
        this.params.globals.get('triggerXAPIEvent')('progressed');
      }

      if (this.params.appearance === 'classic' && index === lastQuestionIndex) {
        panel.show({ focus: params.focus });
      }
      else if (this.params.appearance === 'chat' && index < lastQuestionIndex) {
        panel.show({
          showInstantly: true,
          focus: false,
        });
      }
      else if (this.params.appearance === 'chat' && index === lastQuestionIndex) {
        panel.show({
          showInstantly: params.showInstantly,
          focus: params.focus,
        });
      }
      else {
        panel.hide();
      }
    });

    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {object[]} [params.answersGiven] Previously given answers.
   */
  reset(params = {}) {
    params = Util.extend({ answersGiven: [] }, params);

    const lastQuestionIndex = params.answersGiven.length;

    this.progressBar.setProgress(lastQuestionIndex);

    this.panels.forEach((panel, index) => {
      const answer = params.answersGiven
        .find((answer) => answer.question === index);
      const optionChosen = (answer ?? {}).option;

      panel.reset({ optionChosen: optionChosen });
      panel.hide();
    });
  }

  /**
   * Handle panel completed.
   * @param {number} panelIndex Index of panel that was completed.
   */
  handlePanelCompleted(panelIndex) {
    this.progressBar.setProgress(this.progressBar.getProgress() + 1);

    if (panelIndex + 1 === this.panels.length) {
      this.callbacks.onCompleted();
    }
    else {
      if (this.params.appearance === 'classic') {
        this.panels[panelIndex].hide();
      }
      this.panels[panelIndex + 1].show({ focus: true });
    }
  }
}
