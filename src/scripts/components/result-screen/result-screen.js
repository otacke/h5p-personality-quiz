import Util from '@services/util.js';
import './result-screen.scss';

export default class ResultScreen {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [params.l10n] Localization.
   * @param {object} [params.a11y] Accessibility.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onReset] Callback when reset button clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      l10n: {
        notFinished: 'The quiz was not yet finished',
        reset: 'Retake the quiz'
      },
      a11y: {
        resultsTitle: 'Here are your results.',
      }
    }, params);

    this.callbacks = Util.extend({
      onReset: () => {}
    }, callbacks);

    this.ariaText = '';
    this.resultPersonality = this.params.l10n.notFinished;

    this.buildDOM();
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-result-screen');

    this.explanation = document.createElement('div');
    this.explanation.classList.add(
      'h5p-personality-quiz-result-screen-explanation'
    );
    this.explanation.classList.add('display-none');

    this.title = document.createElement('p');
    this.title.classList.add(
      'h5p-personality-quiz-result-screen-explanation-title'
    );
    this.title.classList.add('display-none');
    this.explanation.append(this.title);

    this.imageInline = document.createElement('img');
    this.imageInline.classList.add(
      'h5p-personality-quiz-result-screen-explanation-image-inline'
    );
    this.imageInline.classList.add('display-none');
    this.imageInline.addEventListener('load', () => {
      this.params.globals.get('resize')();
    });

    this.explanation.append(this.imageInline);

    this.description = document.createElement('p');
    this.description.classList.add(
      'h5p-personality-quiz-result-screen-explanation-description'
    );
    this.description.classList.add('display-none');
    this.explanation.append(this.description);
    this.dom.append(this.explanation);

    this.button = document.createElement('button');
    this.button.classList.add('h5p-personality-quiz-result-screen-reset-button');
    this.button.innerText = this.params.l10n.reset;
    this.button.addEventListener('click', () => {
      this.callbacks.onReset();
    });
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
   * @param {object} [params] Parameters.
   * @param {boolean} [params.fade] If true, will fade in.
   */
  show(params = {}) {
    this.params.globals.get('read')(this.ariaText || '');

    if (!params.fade) {
      this.dom.classList.remove('display-none');
      return;
    }

    this.dom.classList.add('fade-in');
    this.dom.classList.remove('display-none');

    window.setTimeout(() => {
      this.dom.classList.remove('fade-in');
    }, 0);
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   */
  reset() {
    this.resultPersonality = this.params.l10n.notFinished;
  }

  /**
   * Focus.
   */
  focus() {
    this.button.focus();
  }

  /**
   * Set content.
   * @param {object} [params] Parameters.
   * @param {string} params.name Personality name.
   * @param {string} [params.description] Personality description.
   * @param {string} [params.imagePosition] Position 'background' or 'inline'.
   * @param {string} [params.image] Image data.
   */
  setContent(params = {}) {
    params.name = Util.purifyHTML(params.name);

    this.ariaText = `${this.params.a11y.resultsTitle} ${params.name}`;
    this.resultPersonality = params.name;
    this.resultDescription = params.description;
    this.image = params.image;

    if (params.description && this.params.displayDescription) {
      this.ariaText = `${this.ariaText}. ${Util.purifyHTML(params.description)}`;
    }

    // Image as background
    if (
      this.params.imagePosition === 'background' && params.image?.file?.path
    ) {
      const image = document.createElement('img');
      H5P.setSource(
        image, params.image.file, this.params.globals.get('contentId')
      );
      this.dom.style.backgroundImage = `url("${image.src}")`;
    }
    else {
      this.dom.style.backgroundImage = '';
    }

    // Author doesn't want any explanation beyond image
    if (!this.params.displayTitle && !this.params.displayDescription) {
      this.explanation.classList.add('display-none');
    }

    // Title
    if (params.name && this.params.displayTitle) {
      this.explanation.classList.remove('display-none');
      this.title.classList.remove('display-none');
      this.title.innerText = params.name;
    }
    else {
      this.title.classList.add('display-none');
    }

    // Image inline
    if (
      this.params.imagePosition === 'inline' && params.image?.file?.path
    ) {
      const image = document.createElement('img');
      H5P.setSource(
        image, params.image.file, this.params.globals.get('contentId')
      );
      this.imageInline.src = image.src;
      this.imageInline.classList.remove('display-none');
    }
    else {
      this.imageInline.classList.add('display-none');
    }

    // Description
    if (params.description && this.params.displayDescription) {
      this.explanation.classList.remove('display-none');
      this.description.classList.remove('display-none');
      this.description.innerHTML = params.description;
    }
    else {
      this.description.classList.add('display-none');
    }

    if (!params.name && !params.description) {
      this.explanation.classList.add('display-none');
    }
  }

  /**
   * Get current result state.
   * Required, because the result may be randomly chosen on equal scores.
   * @returns {string|null} Current result state.
   */
  getCurrentState() {
    return (this.resultPersonality !== this.params.l10n.notFinished) ?
      this.resultPersonality :
      null;
  }

  /**
   * Get results for result screen.
   * @returns {object} Results.
   */
  getResults() {
    return {
      personality: this.resultPersonality,
      description: this.resultDescription,
      image: this.image
    };
  }
}
