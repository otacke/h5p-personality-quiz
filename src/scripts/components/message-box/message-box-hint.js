import MessageBox from './message-box.js';
import './message-box-hint.scss';

export default class MessageBoxHint extends MessageBox {

  /**
   * Message box for hints.
   * @class
   */
  constructor() {
    super();

    this.dom.classList.add('message-box-hint');
  }
}
