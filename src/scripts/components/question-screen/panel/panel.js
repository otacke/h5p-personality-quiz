import Util from '@services/util';
import Option from './option.js';
import './panel.scss';
import FocusCatcher from './focus-catcher.js';

export default class Panel {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.appearance] Appearence, 'classic', 'chat'.
   * @param {string} [params.questionText] Question text.
   * @param {boolean} [params.animation] If true, animate option buttons.
   * @param {object} [params.answerOptions] Answer options.
   * @param {object} [params.image] Image data.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onAnswerGiven] Callback on answer given.
   * @param {function} [callbacks.onClicked] Callback when panel is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      appearance: 'classic',
      questionText: '',
      answerOptions: []
    }, params);

    this.params.questionText = Util.purifyHTML(this.params.questionText);

    this.callbacks = Util.extend({
      onAnswerGiven: () => {},
      onCompleted: () => {}
    }, callbacks);

    this.isVisibleState = true;

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-panel');
    this.dom.classList.add(`appearance-${this.params.appearance}`);

    // Image
    if (this.params.image?.file?.path) {
      const image = document.createElement('img');
      image.classList.add('h5p-personality-quiz-panel-image');
      image.setAttribute('alt', this.params.image.file.alt ?? '');
      image.addEventListener('load', () => {
        this.params.globals.get('resize')();
      });
      H5P.setSource(
        image, this.params.image.file, this.params.globals.get('contentId')
      );
      this.dom.append(image);
    }

    // Question text
    const questionTextId = H5P.createUUID();

    this.questionText = document.createElement('div');
    this.questionText.classList.add('h5p-personality-quiz-question');
    this.questionText.setAttribute('id', questionTextId);
    this.dom.append(this.questionText);

    if (this.params.animation && this.params.appearance === 'chat') {
      this.typingDots = document.createElement('div');
      this.typingDots.classList.add('typing-animation-dots');
      this.questionText.append(this.typingDots);

      for (let i = 0; i < 3; i++) {
        const typingDot = document.createElement('div');
        typingDot.classList.add('typing-animation-dot');
        this.typingDots.append(typingDot);
      }
    }
    else {
      this.questionText.innerText = this.params.questionText;
    }

    const mode = (this.params.answerOptions.every((option) => {
      return option?.image?.file;
    })) ?
      'image' :
      'text';

    // Options
    this.optionWrapper = document.createElement('ol');
    this.optionWrapper.classList.add('h5p-personality-quiz-answer-options');
    this.optionWrapper.classList.add(`mode-${mode}`);
    this.optionWrapper.setAttribute('aria-labelledby', questionTextId);
    // Some screenreaders do not real label unless role is set to group
    this.optionWrapper.setAttribute('role', 'group');
    if (this.params.animation && this.params.appearance === 'chat') {
      this.optionWrapper.classList.add('display-none');
    }

    this.dom.append(this.optionWrapper);

    this.options = [];

    this.params.answerOptions.forEach((option, index) => {
      const listItem = document.createElement('li');
      listItem.classList.add('h5p-personality-quiz-answer-list-item');
      this.optionWrapper.append(listItem);

      const optionInstance = new Option(
        {
          globals: this.params.globals,
          appearance: this.params.appearance,
          mode: mode,
          text: option.text,
          image: option.image,
          animation: this.params.animation
        },
        {
          onClicked: () => {
            optionInstance.select({ animate: this.params.animation });
            this.handleOptionChosen(index);
          },
          onCompleted: () => {
            this.handleOptionCompleted(index);
          }
        }
      );

      this.options.push(optionInstance);

      listItem.append(optionInstance.getDOM());
    });

    // Used instead of aria-live region to prevent reading button again
    this.focusCatcher = new FocusCatcher();
    this.dom.append(this.focusCatcher.getDOM());
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
   * @param {boolean} [params.showInstantly] If true, skip animation.
   * @param {boolean} [params.focus] If true, set focus.
   */
  show(params = {}) {
    this.dom.classList.remove('display-none');
    this.isVisibleState = true;

    if (
      !params.showInstantly && this.params.appearance === 'chat'
    ) {
      const delayTypingAnimation = Math.min(
        this.params.questionText.length * Panel.DELAY_PER_CHAR_MS,
        Panel.MAX_DELAY_TYPING_ANIMATION_MS
      );

      this.params.globals.get('resize')();

      window.setTimeout(() => {
        this.questionText.innerText = this.params.questionText;

        if (params.focus) {
          this.questionText.scrollIntoView({ behavior: 'smooth' });
        }

        window.setTimeout(() => {
          this.optionWrapper.classList.remove('display-none');
          this.params.globals.get('resize')();
          if (params.focus) {
            window.setTimeout(() => {
              this.focus({ scrollIntoView: true });
            }, 50); // Prevent jumping if focus called before resize
          }

        }, Panel.DELAY_FOR_ANSWER_OPTIONS_MS);
      }, delayTypingAnimation);
    }
    else {
      this.questionText.innerText = this.params.questionText;
      this.optionWrapper.classList.remove('display-none');
      if (params.focus) {
        window.requestAnimationFrame(() => {
          this.focus();
        }); // Ensure option is visible
      }
    }
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    this.isVisibleState = false;
  }

  /**
   * Focus.
   * @param {object} [params] Parameters.
   */
  focus(params) {
    this.options[0]?.focus(params);
  }

  /**
   * Determine whether panel is visible.
   * @returns {boolean} True, if panel is visible, else false.
   */
  isVisible() {
    return this.isVisibleState;
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {number} [params.optionChosen] Index of previously chosen option.
   */
  reset(params = {}) {
    if (this.params.animation && this.params.appearance === 'chat') {
      this.questionText.innerHTML = '';
      this.questionText.append(this.typingDots);
      this.optionWrapper.classList.add('display-none');
    }

    this.options.forEach((option, index) => {
      option.reset({
        disabled: typeof params.optionChosen === 'number',
        selected: params.optionChosen === index
      });
    });
  }

  /**
   * Handle option chosen.
   * @param {number} index Index of option that was chosen.
   */
  handleOptionChosen(index) {
    if (this.params.animation) {
      this.focusCatcher.catch({
        message: this.params.dictionary.get('a11y.standby')
      });
    }

    this.options.forEach((option) => {
      option.disable();
    });

    this.callbacks.onAnswerGiven(index);
  }

  /**
   * Handle option completed.
   */
  handleOptionCompleted() {
    this.callbacks.onCompleted();
  }
}

/** @constant {number} DELAY_PER_CHAR_MS Time to delay showing the question per character. */
Panel.DELAY_PER_CHAR_MS = 40;

/** @constant {number} MAX_DELAY_TYPING_ANIMATION_MS Maximum time to delay showing the question. */
Panel.MAX_DELAY_TYPING_ANIMATION_MS = 2500;

/** @constant {number} DELAY_FOR_ANSWER_OPTIONS_S Time to delay showing the answer options. */
Panel.DELAY_FOR_ANSWER_OPTIONS_MS = 1000;
