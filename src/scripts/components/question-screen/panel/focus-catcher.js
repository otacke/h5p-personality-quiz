import './focus-catcher.scss';

/*
 * Replacement for aria-live-region if catching the focus must be done in order
 * to prevent reading something else, e.g. a button that triggered an action
 * that will reset the focus with a delay.
 * Will be hidden to people who can see.
 */
export default class FocusCatcher {

  /**
   * @class
   */
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-focus-catcher');

    this.dom.addEventListener('blur', () => {
      this.release();
    });

    this.release();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Catch focus.
   * @param {object} [params] Parameters.
   * @param {string} [params.message] Message to read when focus is caught.
   */
  catch(params = {}) {
    this.dom.setAttribute('tabindex', '0');

    if (params.message) {
      this.dom.innerText = params.message;
    }

    window.requestAnimationFrame(() => {
      this.dom.focus();
    });
  }

  /**
   * Release focus.
   */
  release() {
    this.dom.setAttribute('tabindex', '-1');
    this.dom.innerText = '';
  }
}
