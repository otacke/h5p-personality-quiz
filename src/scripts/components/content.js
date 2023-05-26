import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
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

    const done = this.buildDOM();
    if (!done) {
      return;
    }

    this.reset();
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
      this.messageBoxHint.setText(Dictionary.get('l10n.noPersonalities'));
      this.dom.append(this.messageBoxHint.getDOM());

      return false;
    }

    if (!this.params.questions.length) {
      this.messageBoxHint = new MessageBoxHint();
      this.messageBoxHint.setText(Dictionary.get('l10n.noQuestions'));
      this.dom.append(this.messageBoxHint.getDOM());

      return false;
    }

    // Question screen
    this.questionScreen = new QuestionScreen(
      {
        appearance: this.params.appearance,
        questions: this.params.questions,
        colorProgressBar: this.params.colorProgressBar,
        isAnimationOn: this.params.isAnimationOn
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

    if (this.params.resultScreen.animation === 'wheel') {
      // Wheel of fortune
      this.wheelOfFortune = new WheelOfFortune({
        segments: this.params.personalities.map((personality) => {
          return {
            text: personality.name,
            image: personality.image,
            uuid: H5P.createUUID()
          };
        }),
        l10n: {
          skip: Dictionary.get('l10n.skip')
        },
        a11y: {
          started: Dictionary.get('a11y.wheelStarted')
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
        contentId: Globals.get('contentId'),
        introduction: this.params.titleScreen.titleScreenIntroduction,
        medium: this.params.titleScreen.titleScreenMedium,
        buttons: [
          { id: 'start', text: Dictionary.get('l10n.start') }
        ],
        a11y: {
          screenOpened: Dictionary.get('a11y.titleScreenWasOpened')
        }
      }, {
        onButtonClicked: () => {
          this.handleTitleScreenClosed();
        },
        onRead: (text) => {
          Globals.get('read')(text);
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
        l10n: {
          notFinished: Dictionary.get('l10n.notFinished'),
          reset: Dictionary.get('l10n.reset')
        },
        a11y: {
          resultsTitle: Dictionary.get('a11y.resultsTitle')
        }
      },
      {
        onReset: () => {
          this.reset({ shouldSetFocus: true });
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
    return {
      scores: this.scores,
      answersGiven: this.answersGiven
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
    return this.answersGiven.length + 1;
  }

  /**
   * Get result text.
   * @returns {object} Result text.
   */
  getResultText() {
    return this.resultScreen.getResultText();
  }

  /**
   * Handle title screen closed.
   */
  handleTitleScreenClosed() {
    this.questionScreen.show({ answersGiven: this.answersGiven });
    this.questionScreen.focus();

    Globals.get('resize')();
  }

  /**
   * Handle answer given.
   * @param {object} [params={}] Parameters.
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

    Globals.get('triggerXAPIEvent')('progressed');
  }

  /**
   * Handle completed.
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.isFromReset] If true, don't focus, etc.
   */
  handleCompleted(params = {}) {
    this.questionScreen.hide();

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

    this.resultScreen.setContent(this.params.personalities[winnerIndex]);
    Globals.get('triggerXAPIEvent')('completed');

    if (this.params.resultScreen.animation === 'wheel' && !params.isFromReset) {
      this.wheelOfFortune?.show();
      this.wheelOfFortune?.focus();
      Globals.get('resize')();

      this.wheelOfFortune.spinTo(winnerIndex, () => {
        this.wheelOfFortune.hide({ fade: true, onHidden: () => {
          this.resultScreen.show();
          if (!params.isFromReset) {
            this.resultScreen.focus();
          }

          Globals.get('resize')();
        } });
      });
    }
    else if (this.params.resultScreen.animation === 'fade-in') {
      this.resultScreen.show({ fade: true });
      if (!params.isFromReset) {
        this.resultScreen.focus();
      }

      Globals.get('resize')();
    }
    else {
      this.resultScreen.show();
      if (!params.isFromReset) {
        this.resultScreen.focus();
      }

      Globals.get('resize')();
    }
  }

  /**
   * Reset.
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.shouldSetFocus] If true, set focus.
   */
  reset(params = {}) {
    this.scores = this.params.previousState.scores ??
      new Array(this.params.personalities.length).fill(0);

    this.answersGiven = this.params.previousState.answersGiven ?? [];

    this.questionScreen.reset({ answersGiven: this.answersGiven });

    // Only use previous state for first call to reset after initialization
    this.params.previousState = {};

    this.wheelOfFortune?.hide();
    this.resultScreen.hide();

    if (this.params.titleScreen && this.answersGiven.length === 0) {
      this.startScreen.show({
        focusButton: params.shouldSetFocus,
        readOpened: params.shouldSetFocus
      });
    }
    else if (this.answersGiven.length !== this.params.questions.length) {
      this.questionScreen.show({ answersGiven: this.answersGiven });
    }
    else {
      this.handleCompleted({ isFromReset: true });
    }

    Globals.get('resize')();
  }
}
