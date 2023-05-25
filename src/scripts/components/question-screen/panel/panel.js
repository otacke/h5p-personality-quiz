import Globals from '@services/globals';
import Util from '@services/util';
import Option from './option.js';
import './panel.scss';

export default class Panel {

  /**
   * Question screen.
   * @class
   * @param {object} [params={}] Parameters.
   * @param {string} [params.questionText] Question text.
   * @param {boolean} [params.animation] If true, animate option buttons.
   * @param {object} [params.answerOptions] Answer options.
   * @param {object} [params.image={}] Image data.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onAnswerGiven] Callback on answer given.
   * @param {function} [callbacks.onClicked] Callback when panel is completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      questionText: '',
      answerOptions: []
    }, params);

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

    // Image
    if (this.params.image?.file?.path) {
      const image = document.createElement('img');
      image.classList.add('h5p-personality-quiz-panel-image');
      image.setAttribute('alt', this.params.image.file.alt ?? '');
      image.addEventListener('load', () => {
        Globals.get('resize')();
      });
      H5P.setSource(image, this.params.image.file, Globals.get('contentId'));
      this.dom.append(image);
    }

    // Question text
    const questionTextId = H5P.createUUID();

    const questionText = document.createElement('div');
    questionText.classList.add('h5p-personality-quiz-question');
    questionText.setAttribute('id', questionTextId);
    questionText.innerText = this.params.questionText;
    this.dom.append(questionText);

    const mode = (this.params.answerOptions.every((option) => {
      return option?.image?.file;
    })) ?
      'image' :
      'text';

    const style = 'plain'; // TODO: chat

    // Options
    const optionWrapper = document.createElement('ul');
    optionWrapper.classList.add('h5p-personality-quiz-answer-options');
    optionWrapper.classList.add(`mode-${mode}`);
    optionWrapper.setAttribute('aria-labelledby', questionTextId);
    // Some screenreaders do not real label unless role is set to group
    optionWrapper.setAttribute('role', 'group');
    this.dom.append(optionWrapper);

    this.options = [];

    this.params.answerOptions.forEach((option, index) => {
      const listItem = document.createElement('li');
      listItem.classList.add('h5p-personality-quiz-answer-list-item');
      optionWrapper.append(listItem);

      const optionInstance = new Option(
        {
          style: style,
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
   */
  show() {
    this.dom.classList.remove('display-none');
    this.isVisibleState = true;
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
   */
  focus() {
    this.options[0]?.focus();
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
   * @param {object} [params={}] Parameters.
   * @param {number} [params.optionChosen] Index of previously chosen option.
   */
  reset(params = {}) {
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
