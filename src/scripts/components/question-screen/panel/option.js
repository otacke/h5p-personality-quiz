import Util from '@services/util';
import './option.scss';

export default class Option {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.appearance] Appearance, 'classic', 'chat'.
   * @param {string} [params.mode] Mode 'text' or 'image'.
   * @param {string} [params.text] Text for option.
   * @param {object} [params.image] Image data.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClicked] Callback when option is chosen.
   * @param {function} [callbacks.onCompleted] Callback on animation ended.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      appearance: 'classic',
      mode: 'text',
      text: '\u3164', // Invisible but has height.
      image: {}
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onCompleted: () => {}
    }, callbacks);

    if (this.params.appearance === 'chat') {
      this.params.animation = false;
    }

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-answer-option');
    this.dom.classList.add(`appearance-${this.params.appearance}`);
    if (this.params.mode === 'image') {
      this.dom.classList.add('has-image');
    }

    // Button
    this.button = document.createElement('button');
    this.button.classList.add('h5p-personality-quiz-answer-option-button');

    this.button.addEventListener('click', () => {
      window.setTimeout(() => {
        if (this.params.animation) {
          this.button.classList.add('animate');
          this.callbacks.onClicked();
        }
        else {
          this.callbacks.onClicked();
          this.callbacks.onCompleted();
        }
      }, 0);
    });

    this.button.addEventListener('animationend', () => {
      this.callbacks.onCompleted();
    });

    // Image
    if (this.params.mode === 'image') {
      const image = document.createElement('img');
      image.classList.add('h5p-personality-quiz-answer-option-button-image');
      image.setAttribute('alt', this.params.image.alt ?? '');
      image.addEventListener('load', () => {
        this.params.globals.get('resize')();
      });
      H5P.setSource(
        image, this.params.image.file, this.params.globals.get('contentId')
      );
      this.button.append(image);
    }

    // Button text
    this.buttonText = document.createElement('span');
    this.buttonText.classList.add(
      'h5p-personality-quiz-answer-option-button-text'
    );
    this.buttonText.innerText = this.params.text;
    this.button.append(this.buttonText);

    this.dom.append(this.button);
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
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Focus.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.scrollIntoView] If true, scroll into view first.
   */
  focus(params = {}) {
    if (params.scrollIntoView) {
      this.button.scrollIntoView({ behavior: 'smooth' });

      window.setTimeout(() => {
        this.button.focus();
      }, 500); // Let scroll first

      return;
    }

    this.button.focus();
  }

  /**
   * Select.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.animate] If true, animate when being selected.
   */
  select(params = {}) {
    if (params.animate) {
      this.buttonText.classList.add('animate');
    }

    this.buttonText.classList.add('selected');
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.selected] If true, set to selected.
   * @param {boolean} [params.disabled] If true, set to disabled.
   */
  reset(params = {}) {
    this.buttonText.classList.remove('animate');
    this.buttonText.classList.remove('selected');

    if (params.selected) {
      this.select();
    }

    if (params.disabled) {
      this.disable();
    }
    else {
      this.enable();
    }
  }

  /**
   * Enable.
   */
  enable() {
    this.button.removeAttribute('disabled');
  }

  /**
   * Disable.
   */
  disable() {
    this.button.setAttribute('disabled', 'disabled');
  }
}
