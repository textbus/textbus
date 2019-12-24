import { TBus } from './lib/tbus';
import { EditorOptions } from './lib/tbus';

import {
  alignHandler,
  backgroundHandler,
  blockquoteHandler,
  boldHandler,
  cleanHandler,
  codeHandler,
  colorHandler,
  fontFamilyHandler,
  fontSizeHandler,
  hHandler,
  historyBackHandler,
  historyForwardHandler,
  imageHandler,
  indentHandler,
  italicHandler,
  letterSpacingHandler,
  lineHeightHandler,
  linkHandler,
  musicHandler,
  olHandler,
  strikeThroughHandler,
  subscriptHandler,
  superscriptHandler,
  tableHandler,
  tableEditHandler,
  textBackgroundHandler,
  ulHandler,
  underlineHandler,
  videoHandler
} from './lib/toolbar/formats/_api';

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  const op: EditorOptions = {
    handlers: [
      colorHandler,

    ]
  };

  return new TBus(selector, Object.assign(op, options));
}
