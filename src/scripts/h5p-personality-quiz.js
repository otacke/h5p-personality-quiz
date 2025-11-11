import Util from '@services/util.js';
import Dictionary from '@services/dictionary.js';
import Screenreader from '@services/screenreader.js';
import Content from '@components/content.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import Sanitization from '@mixins/sanitization.js';
import XAPI from '@mixins/xapi.js';
import Color from 'color';
import '@styles/h5p-personality-quiz.scss';

/** @constant {number} DIFF_FACTOR_HOVER Factor to lighten/darken color on hover. */
const DIFF_FACTOR_HOVER = 0.25;

/** @constant {number} DIFF_FACTOR_ACTIVE Factor to lighten/darken color on active. */
const DIFF_FACTOR_ACTIVE = 0.37;

/** @constant {number} DIFF_FACTOR_PALE Factor to lighten/darken color for pale version. */
const DIFF_FACTOR_PALE = 0.9;

export default class PersonalityQuiz extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(PersonalityQuiz, [QuestionTypeContract, Sanitization, XAPI]);

    // Sanitize parameters
    this.params = Util.extend({
      titleScreen: {
        title: {},
      },
      questionsGroup: {
        questions: [],
      },
      personalitiesGroup: {
        personalities: [],
      },
      visual: {
        isAnimationOn: true,
        showProgressBar: true,
        appearance: 'classic',
        colorButton: '#1a73d9',
        colorProgressBar: '#1a73d9',
      },
      l10n: {
        noQuestions: 'It seems that there is no valid question set. Try checking for valid personality names.',
        // eslint-disable-next-line @stylistic/js/max-len
        noPersonalities: 'It seems that there are not enough valid personalities set. Try checking for missing names or duplicate names.',
        start: 'Start',
        currentOfTotal: '@current of @total',
        skip: 'Skip',
        reset: 'Restart',
        notFinished: 'The quiz was not finished yet.',
      },
      a11y: {
        titleScreenWasOpened: 'The title screen was opened.',
        wheelStarted: 'The wheel of fortune started spinning. Please wait a moment.',
        progressBar: 'Progress bar',
        resultsTitle: 'Here are your results.',
        standby: 'Stand by.',
      },
      behaviour: {
        delegateResults: false, // Used for external override
      },
    }, params);

    // Override result screen animation if required
    if (!this.params.visual.isAnimationOn) {
      this.params.resultScreen.animation = 'none';
    }

    this.sanitizeParameters();

    this.contentId = contentId;
    this.extras = extras;

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    // Globals
    this.globals = new Map();
    this.globals.set('contentId', this.contentId);
    this.globals.set('resize', () => {
      this.trigger('resize');
    });
    this.globals.set('read', (text) => {
      Screenreader.read(text);
    });
    this.globals.set('triggerXAPIEvent', (verb) => {
      return this.triggerXAPIEvent(verb);
    });

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    this.previousState = extras?.previousState || {};

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = this.buildDOM();

    this.setupColorScheme();
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-personality-quiz');
    $wrapper.get(0).appendChild(this.dom);
  }

  /**
   * Run content.
   * Can be uset to puppeteer content with the parameter
   * `params.behaviour.delegateResults=true` that will hand over control to the
   *  parent content.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.focus] If true. set focus.
   */
  run(params) {
    this.content.run(params);
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-personality-quiz-main');

    this.content = new Content({
      dictionary: this.dictionary,
      globals: this.globals,
      appearance: this.params.visual.appearance,
      previousState: this.previousState,
      personalities: this.params.personalities,
      questions: this.params.questions,
      colorProgressBar: this.params.visual.colorProgressBar,
      isAnimationOn: this.params.visual.isAnimationOn,
      showProgressBar: this.params.visual.showProgressBar,
      resultScreen: this.params.resultScreen,
      delegateResults: this.params.behaviour.delegateResults,
      delegateRun: this.params.behaviour.delegateRun,
      ...(this.params.showTitleScreen &&
        {
          titleScreen: {
            titleScreenIntroduction:
              this.params.titleScreen.titleScreenIntroduction,
            titleScreenMedium:
              this.params.titleScreen.titleScreenMedium,
          },
        }
      ),
    });

    this.on('resize', () => {
      this.content.resize();
    });

    dom.append(this.content.getDOM());

    return dom;
  }

  /**
   * Get number of questions.
   * Could be computed using params, but would duplicate sanitizing.
   * @returns {number} Number of questions.
   */
  getNumberOfQuestions() {
    return this.params.questions.length ?? 0;
  }

  /**
   * Setup color scheme.
   */
  setupColorScheme() {
    const colorBase = Color(this.params.visual.colorButton);
    const colorText = (colorBase.isDark()) ?
      '#ffffff' :
      '#000000';

    const colorHover = (colorBase.isDark()) ?
      colorBase.darken(DIFF_FACTOR_HOVER) :
      colorBase.lighten(DIFF_FACTOR_HOVER);

    const colorActive = (colorBase.isDark()) ?
      colorBase.darken(DIFF_FACTOR_ACTIVE) :
      colorBase.lighten(DIFF_FACTOR_ACTIVE);

    const colorTextActive = (colorActive.isDark()) ?
      '#ffffff' :
      '#000000';

    const colorPale = colorBase.mix(Color('#ffffff'), DIFF_FACTOR_PALE);

    this.dom.style.setProperty('--color-button-background', colorBase.hex());
    this.dom.style.setProperty('--color-button-text', colorText);
    this.dom.style.setProperty('--color-button-hover', colorHover);
    this.dom.style.setProperty('--color-button-active', colorActive);
    this.dom.style.setProperty('--color-button-text-active', colorTextActive);
    this.dom.style.setProperty('--color-button-pale', colorPale);
  }

  /**
   * Get current position.
   * @returns {number} Current position.
   */
  getCurrentPosition() {
    return this.content?.getCurrentPosition();
  }

  /**
   * Get current state.
   * @returns {object|undefined} Current state.
   */
  getCurrentState() {
    if (!this.getAnswerGiven()) {
      // Nothing relevant to store, but previous state in DB must be cleared after reset
      return this.contentWasReset ? {} : undefined;
    }

    return this.content?.getCurrentState();
  }

  /**
   * Get context data.
   * Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    const position = (this.content) ?
      this.content?.getCurrentPosition() + 1 :
      (this.previousState?.answersGiven?.length + 1) || 1;

    return {
      type: 'question',
      value: position,
    };
  }

  /**
   * Get results for content.
   * @returns {object} Results.
   */
  getResults() {
    return {
      title: this.extras.metadata.title,
      ...this.content?.getResults(),
    };
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || PersonalityQuiz.DEFAULT_DESCRIPTION,
    );
  }

  /**
   * Get description.
   * @returns {string} Description.
   */
  getDescription() {
    return PersonalityQuiz.DEFAULT_DESCRIPTION;
  }
}

/** @constant {string} Default description */
PersonalityQuiz.DEFAULT_DESCRIPTION = 'Personality Quiz';
