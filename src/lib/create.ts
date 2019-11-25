import { Editor } from './lib/editor';
import { EditorOptions } from './lib/editor';

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
  ulHandler,
  underlineHandler,
  videoHandler
} from './lib/toolbar/formats/_api';

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  const op: EditorOptions = {
    handlers: [
      imageHandler,

    ]
  };

  return new Editor(selector, Object.assign(op, options));
}
