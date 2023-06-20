import Util from '@services/util';
import MediaScreen from '@components/media-screen/media-screen';
import MessageBoxHint from '@components/message-box/message-box-hint';
import QuestionScreen from '@components/question-screen/question-screen';
import ResultScreen from '@components/result-screen/result-screen';
import WheelOfFortune from '@components/wheel-of-fortune/wheel-of-fortune';

export default class Content {

  constructor(params = {}) {
    this.params = Util.extend({
      personalities: [],
      questions: [],
      previousState: {}
    }, params);

    // Compute score matrix
    this.scoreMatrix = this.params.questions.map((question) => {
      return question.answers.map((answer) => {
        return answer.personality.split(',').map((benefitPersonality) => {
          const segments = benefitPersonality.split('=');
          const score = Number(segments.pop());
          const beneficiary = segments.join('=');
          const personalityIndex = this.params.personalities
            .findIndex((personality) => {
              return personality.name.toLowerCase() === beneficiary;
            });

          return {
            personalityIndex: personalityIndex,
            score: score
          };
        });
      });
    });

    this.scores = this.params.previousState.scores ??
      new Array(this.params.personalities.length).fill(0);

    this.answersGiven = this.params.previousState.answersGiven ?? [];

    const done = this.buildDOM();
    if (!done) {
      return;
    }

    if (!this.params.delegateRun) {
      this.reset();
    }
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build DOM.
   * @returns {boolean} True, if done fine.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-content');

    if (!this.params.personalities.length) {
      this.messageBoxHint = new MessageBoxHint();
      this.messageBoxHint.setText(
        this.params.dictionary.get('l10n.noPersonalities')
      );
      this.dom.append(this.messageBoxHint.getDOM());

      return false;
    }

    if (!this.params.questions.length) {
      this.messageBoxHint = new MessageBoxHint();
      this.messageBoxHint.setText(
        this.params.dictionary.get('l10n.noQuestions')
      );
      this.dom.append(this.messageBoxHint.getDOM());

      return false;
    }

    // Question screen
    this.questionScreen = new QuestionScreen(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        appearance: this.params.appearance,
        questions: this.params.questions,
        colorProgressBar: this.params.colorProgressBar,
        isAnimationOn: this.params.isAnimationOn,
        showProgressBar: this.params.showProgressBar
      },
      {
        onAnswerGiven: (params) => {
          this.handleAnswerGiven(params);
        },
        onCompleted: () => {
          this.handleCompleted();
        }
      }
    );
    this.questionScreen.hide();
    this.dom.append(this.questionScreen.getDOM());

    if (
      !this.params.delegateResults &&
      this.params.resultScreen.animation === 'wheel'
    ) {
      // Wheel of fortune
      this.wheelOfFortune = new WheelOfFortune({
        globals: this.params.globals,
        segments: this.params.personalities.map((personality) => {
          return {
            text: personality.name,
            image: personality.image,
            uuid: H5P.createUUID()
          };
        }),
        l10n: {
          skip: this.params.dictionary.get('l10n.skip')
        },
        a11y: {
          started: this.params.dictionary.get('a11y.wheelStarted')
        }
      });
      this.wheelOfFortune.hide();
      this.dom.append(this.wheelOfFortune.getDOM());
    }

    // Title screen if set
    if (this.params.titleScreen) {
      this.intro = document.createElement('div');
      this.intro.classList.add('h5p-personality-quiz-content-intro');

      this.startScreen = new MediaScreen({
        id: 'start',
        contentId: this.params.globals.get('contentId'),
        introduction: this.params.titleScreen.titleScreenIntroduction,
        medium: this.params.titleScreen.titleScreenMedium,
        buttons: [
          { id: 'start', text: this.params.dictionary.get('l10n.start') }
        ],
        a11y: {
          screenOpened: this.params.dictionary.get('a11y.titleScreenWasOpened')
        }
      }, {
        onButtonClicked: () => {
          this.handleTitleScreenClosed();
        },
        onRead: (text) => {
          this.params.globals.get('read')(text);
        }
      });

      this.startScreen.hide();
      this.intro.append(this.startScreen.getDOM());

      this.dom.append(this.intro);
    }

    // Result screen
    this.resultScreen = new ResultScreen(
      {
        ...(this.params.resultScreen),
        globals: this.params.globals,
        l10n: {
          notFinished: this.params.dictionary.get('l10n.notFinished'),
          reset: this.params.dictionary.get('l10n.reset')
        },
        a11y: {
          resultsTitle: this.params.dictionary.get('a11y.resultsTitle')
        }
      },
      {
        onReset: () => {
          this.reset({ focus: true });
        }
      }
    );
    this.resultScreen.hide();
    this.dom.append(this.resultScreen.getDOM());

    return true;
  }

  /**
   * Resize.
   */
  resize() {
    this.wheelOfFortune?.resize();
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    const results = this.resultScreen.getCurrentState();

    return {
      scores: this.scores,
      answersGiven: this.answersGiven,
      ...(results && { results: results })
    };
  }

  /**
   * Check if answer was given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.answersGiven.length > 0;
  }

  /**
   * Get current position.
   * @returns {number} Current position.
   */
  getCurrentPosition() {
    if (!this.answersGiven) {
      return 0;
    }

    return this.answersGiven.length;
  }

  /**
   * Get results for result screen.
   * @returns {object} Results.
   */
  getResults() {
    return this.resultScreen.getResults();
  }

  /**
   * Handle title screen closed.
   */
  handleTitleScreenClosed() {
    this.questionScreen.show({
      answersGiven: this.answersGiven,
      focus: true
    });

    this.params.globals.get('resize')();
  }

  /**
   * Handle answer given.
   * @param {object} [params] Parameters.
   * @param {number} params.questionIndex Index of question.
   * @param {number} params.optionIndex Index of chosen option.
   */
  handleAnswerGiven(params = {}) {
    this.scoreMatrix[params.questionIndex][params.optionIndex]
      .forEach((scoreEntry) => {
        this.scores[scoreEntry.personalityIndex] += scoreEntry.score;
      });

    this.answersGiven.push({
      question: params.questionIndex,
      option: params.optionIndex
    });

    if (this.answersGiven.length < this.params.questions.length) {
      this.params.globals.get('triggerXAPIEvent')('progressed');
    }
  }

  /**
   * Handle completed.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isFromReset] If true, don't focus, etc.
   */
  handleCompleted(params = {}) {
    // Determine one personality with highest score
    const maxScore = Math.max(...this.scores);
    const winnerIndexes = this.scores.reduce((winners, current, index) => {
      return (current !== maxScore) ?
        winners :
        [...winners, index];
    }, []);

    const winnerIndex = winnerIndexes[
      Math.floor(Math.random() * winnerIndexes.length)
    ];

    // Was already completed before
    if (!this.resultScreen.getCurrentState()) {
      this.resultScreen.setContent(this.params.personalities[winnerIndex]);
      this.params.globals.get('triggerXAPIEvent')('completed');
    }

    if (this.params.delegateResults) {
      return;
    }

    this.questionScreen.hide();

    if (this.params.resultScreen.animation === 'wheel' && !params.isFromReset) {
      this.wheelOfFortune?.show();
      this.wheelOfFortune?.focus();
      this.params.globals.get('resize')();

      this.wheelOfFortune.spinTo(winnerIndex, () => {
        this.wheelOfFortune.hide({ fade: true, onHidden: () => {
          this.resultScreen.show();
          if (!params.isFromReset) {
            this.resultScreen.focus();
          }

          this.params.globals.get('resize')();
        } });
      });
    }
    else if (this.params.resultScreen.animation === 'fade-in') {
      this.resultScreen.show({ fade: true });
      if (!params.isFromReset) {
        this.resultScreen.focus();
      }

      this.params.globals.get('resize')();
    }
    else {
      this.resultScreen.show();
      if (!params.isFromReset) {
        this.resultScreen.focus();
      }

      this.params.globals.get('resize')();
    }
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.showInstantly] If true, don't animate anything.
   * @param {boolean} [params.focus] If true, set focus.
   */
  reset(params = {}) {
    this.scores = this.params.previousState.scores ??
      new Array(this.params.personalities.length).fill(0);

    this.answersGiven = this.params.previousState.answersGiven ?? [];

    this.questionScreen.reset({ answersGiven: this.answersGiven });
    this.wheelOfFortune?.hide();
    this.resultScreen.hide();
    this.resultScreen.reset();

    /*
     * Result may be chosen randomly on equal scores for personalities, so
     * use saved result if present.
     */
    if (this.params.previousState.results) {
      this.resultScreen.setContent(
        this.params.personalities.find((personality) => {
          return personality.name === this.params.previousState.results;
        })
      );
    }

    // Only use previous state for first call to reset after initialization
    this.params.previousState = {};

    if (params.showInstantly) {
      this.questionScreen.show({
        answersGiven: this.answersGiven,
        focus: params.focus,
        showInstantly: params.showInstantly
      });
    }
    else if (
      this.params.delegateRun &&
      this.answersGiven.length !== this.params.questions.length
    ) {
      this.questionScreen.show({
        answersGiven: this.answersGiven,
        focus: params.focus
      });
    }
    else if (this.params.titleScreen && this.answersGiven.length === 0) {
      this.startScreen.show({
        focusButton: params.focus,
        readOpened: params.focus
      });
    }
    else if (this.answersGiven.length !== this.params.questions.length) {
      this.questionScreen.show({
        answersGiven: this.answersGiven,
        focus: !!params.focus
      });
    }
    else {
      this.handleCompleted({ isFromReset: true });
    }

    this.params.globals.get('resize')();
  }

  /**
   * Run content.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.focus] If true. set focus.
   */
  run(params = {}) {
    this.reset(params);
  }
}
