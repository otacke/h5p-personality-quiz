import Util from '@services/util.js';
import Color from 'color';
import './wheel-of-fortune.scss';

export default class WheelOfFortune {

  /**
   * General purpose message box.
   * @class
   * @param {object} [params] Parameters.
   * @param {object[]} [params.segments] Segments' data.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      segments: [{ text: 'Placeholder' }, { text: 'Placeholder' }],
      l10n: {
        skip: 'Skip'
      },
      a11y: {
        started: 'The wheel of fortune started spinning. Please wait a moment.'
      }
    }, params);

    this.onDone = () => {};

    this.dom = document.createElement('div');
    this.dom.classList.add('wheel-of-fortune');

    this.wheel = document.createElement('div');
    this.wheel.classList.add('wheel-of-fortune-wheel');
    this.dom.append(this.wheel);

    const wheel = this.buildWheelSVG({
      segments: this.params.segments
    });

    // Appending SVG element does not work, so innerHTML and querySelector
    this.wheel.innerHTML = wheel.outerHTML;
    this.wheelSegments = this.dom.querySelector('.wheel-of-fortune-segments');

    this.button = document.createElement('button');
    this.button.classList.add('wheel-of-fortune-button');
    this.button.innerText = this.params.l10n.skip;
    this.button.addEventListener('click', () => {
      window.clearTimeout(this.wheelTimeout);
      this.onDone();
      this.onDone = () => {};
    });
    this.dom.append(this.button);

    this.hide = this.hide.bind(this);

    this.isVisible = true;

    this.setAngle(0);
  }

  /**
   * Resize.
   */
  resize() {
    if (this.isVisible) {
      this.clipWheel();
    }
  }

  /**
   * Clip wheel to hide overflowing text.
   */
  clipWheel() {
    window.requestAnimationFrame(() => {
      const backdrop = this.dom.querySelector('.wheel-of-fortune-backdrop');
      const maxSize = (
        backdrop.getBoundingClientRect().width -
        WheelOfFortune.INDICATOR_RADIUS -
        WheelOfFortune.LABEL_OFFSET
      ) / 2;

      this.wheel.style.clipPath = `circle(${maxSize}px at 50% 50%)`;
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
    this.isVisible = true;
    this.dom.classList.remove('display-none');

    this.resize();
  }

  /**
   * Hide.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.fade] If true, will fade out before hiding.
   * @param {function} [params.onHidden] Callback when hidden.
   */
  hide(params = {}) {
    if (!this.isVisible) {
      return;
    }

    // Remember callback
    if (params.onHidden) {
      this.onHidden = params.onHidden;
    }

    if (!params.fade) {
      this.isVisible = false;

      this.dom.removeEventListener('transitionend', this.hide);

      this.dom.classList.remove('fade-out');
      this.dom.classList.add('display-none');

      this.onHidden?.();
      delete this.onHidden;

      return;
    }

    this.dom.addEventListener('transitionend', this.hide);
    this.dom.classList.add('fade-out');
  }

  /**
   * Focus.
   */
  focus() {
    window.setTimeout(() => {
      this.button.focus();
    }, 100); // Ensure that aria start message is read first
  }

  /**
   * Spin to particular segment.
   * @param {number} segmentIndex Segment index.
   * @param {function} onDone Callback when done.
   */
  spinTo(segmentIndex, onDone) {
    if (segmentIndex < 0 || segmentIndex > this.params.segments.length) {
      return;
    }

    const min = 360 / this.params.segments.length * segmentIndex;
    const max = 360 / this.params.segments.length * (segmentIndex + 1);

    // Prevent stop on border of two segments
    let segmentAngle = Math.random() * (max - min - 2) + min + 1;

    this.onDone = () => {
      onDone?.(segmentIndex);
    };

    this.spin({ change: WheelOfFortune.SPIN_ROUNDS * 360 + segmentAngle });
  }

  /**
   * Spin wheel.
   * @param {object} [params] Parameters.
   * @param {number} params.time Current time
   * @param {number} params.start Start value.
   * @param {number} params.delta Delta from start.
   * @param {number} params.duration Duration or max time.
   */
  spin(params = {}) {
    params = Util.extend({
      start: 0,
      change: WheelOfFortune.SPIN_ROUNDS * 360,
      currentTime: 0,
      duration: WheelOfFortune.SPIN_DURATION_MS
    }, params);

    if (params.currentTime === 0) {
      this.params.globals.get('read')(this.params.a11y.started);
    }
    else if (params.currentTime >= params.duration) {
      this.onDone();
      this.onDone = () => {};
      return;
    }

    this.setAngle(Util.easeInOutQuad(
      params.currentTime,
      params.start,
      params.change,
      params.duration
    ));

    window.clearTimeout(this.wheelTimeout);
    this.wheelTimeout = window.setTimeout(() => {
      this.spin({
        start: params.start,
        change: params.change,
        currentTime: params.currentTime + WheelOfFortune.SPIN_UPDATE_INTERVAL_MS,
        duration: params.duration,
        onDone: params.onDone
      });
    }, WheelOfFortune.SPIN_UPDATE_INTERVAL_MS);
  }

  /**
   * Get current segment index.
   * @returns {number} Current segment index.
   */
  getSegmentIndex() {
    return Math.floor(this.getAngle() / (360 / this.params.segments.length));
  }

  /**
   * Get current angle.
   * @returns {number} Current angle.
   */
  getAngle() {
    return (
      ((this.currentAngle ?? 0) - WheelOfFortune.INDICATOR_ROTATION_DEG) % 360 + 360
    ) % 360;
  }

  /**
   * Set angle of wheel.
   * @param {number} degrees Degrees.
   */
  setAngle(degrees) {
    if (typeof degrees !== 'number') {
      return;
    }

    this.currentAngle = (
      (degrees + WheelOfFortune.INDICATOR_ROTATION_DEG) % 360 + 360
    ) % 360;

    this.wheelSegments.style.transform =
      `translate(50%, 50%) rotate(${this.currentAngle}deg)`;
  }

  /**
   * Build SVG.
   * @param {object} [params] Parameters.
   * @returns {SVGElement} SVG.
   */
  buildWheelSVG(params = {}) {
    params = Util.extend({
      segments: []
    }, params);

    const wheel = document.createElement('svg');
    wheel.setAttribute('width', '100%');
    wheel.setAttribute('height', '100%');
    wheel.setAttribute('viewBox', '0 0 100 100');
    wheel.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Create background pattern
    const defs = document.createElement('defs');

    this.params.segments.forEach((segment) => {
      if (!segment.image?.file?.path) {
        return; // No background image given
      }

      const pattern = document.createElement('pattern');
      pattern.setAttribute('id', `wheel-of-fortune-segment-image-${segment.uuid}`);
      pattern.setAttribute('width', '100%');
      pattern.setAttribute('height', '100%');

      const tmpImg = document.createElement('img');
      H5P.setSource(
        tmpImg, segment.image.file, this.params.globals.get('contentId')
      );

      // Try to
      const image = document.createElement('image');
      image.setAttribute('width', '200%');
      image.setAttribute('height', '200%');
      image.setAttribute('x', '-50%');
      image.setAttribute('y', '-50%');
      image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      image.setAttribute('href', tmpImg.src);
      pattern.appendChild(image);

      defs.appendChild(pattern);
    });

    wheel.appendChild(defs);

    // Backdrop circle (for transparent images and clipping)
    const circle = document.createElement('circle');
    circle.classList.add('wheel-of-fortune-backdrop');
    circle.setAttribute('cx', WheelOfFortune.CENTER);
    circle.setAttribute('cy', WheelOfFortune.CENTER);
    circle.setAttribute('r', WheelOfFortune.RADIUS);
    wheel.append(circle);

    // Add all segments to wheel
    const wheelSegments = this.buildSegmentWrapper();
    for (let i = 0; i < params.segments.length; i++) {
      const segment = this.buildSegment({
        startAngle: i * 2 * Math.PI / params.segments.length,
        endAngle: (i + 1) * 2 * Math.PI / params.segments.length,
        whiteValue: 0.75 / params.segments.length * (i + 1),
        text: params.segments[i].text,
        image: params.segments[i].image,
        uuid: this.params.segments[i].uuid
      });

      wheelSegments.append(segment);
      wheel.append(wheelSegments);
    }

    // Position indicator
    const indicator = this.buildPositionIndicator();
    wheel.append(indicator);

    return wheel;
  }

  /**
   * Build segment wrapper.
   * @returns {SVGElement} Segment wrapper.
   */
  buildSegmentWrapper() {
    const wrapper = document.createElement('g');
    wrapper.classList.add('wheel-of-fortune-segments');

    return wrapper;
  }

  /**
   * Build segment.
   * @param {object} [params] Parameters.
   * @param {number} [params.startAngle] Start angle.
   * @param {number} [params.endAngle] End angle.
   * @param {number} [params.whiteValue] White value
   * @param {string} [params.fillColor] Fill color.
   * @param {string} [params.text] Segment text.
   * @returns {HTMLElement} Segment element.
   */
  buildSegment(params = {}) {
    params = Util.extend({
      startAngle: 0,
      endAngle: Math.PI * 1.99999, // 360° exactly would reault in 0°
      fillColor: 'rgb(26 115 217)',
      whiteValue: 0
    }, params);

    if (params.startAngle > params.endAngle) {
      const tmp = params.startAngle;
      params.startAngle = params.endAngle;
      params.endAngle = tmp;
    }

    params.endAngle = Math.min(params.endAngle, Math.PI * 1.99999);
    params.coverAngle = params.endAngle - params.startAngle;

    const group = document.createElement('g');

    const segment = document.createElement('path');
    segment.classList.add('wheel-of-fortune-segment');

    const start = 'M 0 0';
    const line = `L ${Math.cos(params.startAngle) * WheelOfFortune.RADIUS} ${-Math.sin(params.startAngle) * WheelOfFortune.RADIUS}`;
    const large = params.endAngle - params.startAngle <= Math.PI ? 0 : 1;
    const arch = `A ${WheelOfFortune.RADIUS} ${WheelOfFortune.RADIUS} 0 ${large} 0 ${Math.cos(params.endAngle) * WheelOfFortune.RADIUS} ${-Math.sin(params.endAngle) * WheelOfFortune.RADIUS}`;

    segment.setAttribute('d', `${start} ${line} ${arch} Z`);

    const backgroundColor = Color(params.fillColor)
      .mix(Color('#ffffff'), params.whiteValue);

    if (params.image) {
      segment.setAttribute('fill', `url(#wheel-of-fortune-segment-image-${params.uuid})`);
    }
    else {
      segment.setAttribute('fill', backgroundColor.hex());
    }

    group.append(segment);

    if (!params.image && params.text) {
      const text = document.createElement('text');
      text.setAttribute('x',
        WheelOfFortune.INDICATOR_RADIUS + WheelOfFortune.LABEL_OFFSET
      );
      text.setAttribute('y', `${4}`);
      text.innerText = params.text;
      text.style.font = `${WheelOfFortune.LABEL_TEXT_SIZE_PX}px sans-serif`;

      const textAngle = (-2 * params.startAngle - params.coverAngle) * 90 / Math.PI;
      text.style.transform = `rotate(${textAngle}deg)`;

      if (backgroundColor.isDark()) {
        text.setAttribute('fill', '#eeeeee');
      }
      else {
        text.setAttribute('fill', '#111111');
      }

      group.append(text);
    }

    return group;
  }

  /**
   * Build position indicator.
   * @returns {SVGElement} Position indicator group.
   */
  buildPositionIndicator() {
    const indicator = document.createElement('g');

    const triangle = document.createElement('polygon');
    triangle.classList.add('wheel-of-fortune-indicator-knob');
    const points = [
      `${WheelOfFortune.CENTER - WheelOfFortune.INDICATOR_RADIUS} ${WheelOfFortune.CENTER}`,
      `${WheelOfFortune.CENTER + WheelOfFortune.INDICATOR_RADIUS} ${WheelOfFortune.CENTER}`,
      `${WheelOfFortune.CENTER} ${WheelOfFortune.CENTER - (WheelOfFortune.INDICATOR_RADIUS + WheelOfFortune.LABEL_OFFSET - 1)}`
    ];
    triangle.setAttribute('points', points.join(', '));
    indicator.append(triangle);

    const circle = document.createElement('circle');
    circle.classList.add('wheel-of-fortune-indicator');
    circle.setAttribute('cx', WheelOfFortune.CENTER);
    circle.setAttribute('cy', WheelOfFortune.CENTER);
    circle.setAttribute('r', WheelOfFortune.INDICATOR_RADIUS);
    indicator.append(circle);

    return indicator;
  }
}

/** @constant {number} CENTER Center point in percent. */
WheelOfFortune.CENTER = 50;

/** @constant {number} RADIUS Radius in percent. */
WheelOfFortune.RADIUS = 50;

/** @constant {number} INDICATOR_RADIUS Indicator radius in percent. */
WheelOfFortune.INDICATOR_RADIUS = WheelOfFortune.RADIUS / 7.5;

/** @constant {number} INDICATOR_ROTATION Indicator rotation offset. */
WheelOfFortune.INDICATOR_ROTATION_DEG = -90;

/** @constant {number} LABEL_OFFSET Label offset. */
WheelOfFortune.LABEL_OFFSET = 5;

/** @constant {number} LABEL_TEXT_SIZE_PX Label text size in px (SVG viewport). */
WheelOfFortune.LABEL_TEXT_SIZE_PX = 6;

/** @constant {number} SPIN_ROUNDS Number of rounds to spin. */
WheelOfFortune.SPIN_ROUNDS = 5;

/** @constant {number} SPIN_UPDATE_INTERVAL_MS Spinning update interval in MS. */
WheelOfFortune.SPIN_UPDATE_INTERVAL_MS = 50;

/** @constant {number} SPIN_DURATION_MS Total spin duration. */
WheelOfFortune.SPIN_DURATION_MS = 5000;
