import Util from '@services/util';
import Color from 'color';
import './progress-bar.scss';

export default class ProgressBar {

  /**
   * Question screen.
   * @class
   * @param {object} [params] Parameters.
   * @param {number} [params.valueMin] Minimum progress number.
   * @param {number} [params.valueMax] Maximum progress number.
   * @param {string} [params.baseColor] Base color for bar.
   * @param {object} [params.l10n] Localization.
   * @param {string} [params.l10n.currentOfTotal] Text in progress bar.
   * @param {object} [params.a11y] Accessibility.
   * @param {string} [params.a11y.progressBar] Screen reader: "Progress bar".
   */
  constructor(params = {}) {
    this.params = Util.extend({
      valueMin: 1,
      valueMax: 1,
      baseColor: '#1a73d9',
      l10n: {
        currentOfTotal: '@current of @total'
      },
      a11y: {
        progressBar: 'Progress bar',
      }
    }, params);

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('progress-bar');
    this.dom.setAttribute('role', 'progressbar');
    this.dom.setAttribute('aria-valuemin', this.params.valueMin);
    this.dom.setAttribute('aria-valuemax', this.params.valueMax);
    this.dom.setAttribute('aria-label', this.params.a11y.progressBar);

    if (this.params.isAnimated) {
      this.dom.classList.add('is-animated');
    }

    this.label = document.createElement('div');
    this.label.classList.add('progress-bar-label');
    this.dom.append(this.label);

    // Assign colors
    const baseColor = new Color(this.params.baseColor);
    this.dom.style.setProperty('--color-base', baseColor.hex());

    // #767676 gives proper contrast for both black and white
    this.dom.style.setProperty('--color-background', '#767676');
    if (baseColor.isDark()) {
      this.dom.style.setProperty('--color-text', '#ffffff');
    }
    else {
      this.dom.style.setProperty('--color-text', '#000000');
    }
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
   * Get progress.
   * @returns {number} Current progress.
   */
  getProgress() {
    return this.progress;
  }

  /**
   * Set progress.
   * @param {number} progress Current progress.
   */
  setProgress(progress) {
    if (
      typeof progress !== 'number' ||
      typeof progress < 1 || progress > this.params.valueMax
    ) {
      return; // Out of bounds
    }

    this.label.innerText = this.params.l10n.currentOfTotal
      .replace(/@current/g, progress)
      .replace(/@total/g, this.params.valueMax);

    this.dom.style.setProperty(
      '--bar-width', progress / this.params.valueMax * 100
    );
    this.dom.setAttribute('aria-valuenow', progress);

    this.progress = progress;
  }
}
