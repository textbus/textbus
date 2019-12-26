import { TBus } from './lib/tbus';
import { EditorOptions } from './lib/tbus';

import {
  alignHandler,
  blockBackgroundHandler,
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
      [
        historyBackHandler,
        historyForwardHandler
      ],
      [
        hHandler
      ], [
        boldHandler,
        italicHandler,
        strikeThroughHandler,
        underlineHandler,
      ], [
        blockquoteHandler,
        codeHandler
      ], [
        olHandler,
        ulHandler
      ], [
        fontSizeHandler,
        lineHeightHandler,
        letterSpacingHandler,
        indentHandler
      ], [
        superscriptHandler,
        subscriptHandler
      ], [
        colorHandler,
        textBackgroundHandler,
        blockBackgroundHandler
      ], [
        fontFamilyHandler
      ], [
        linkHandler,
        imageHandler,
        musicHandler,
        videoHandler
      ], [
        alignHandler
      ], [
        tableHandler,
        tableEditHandler
      ], [
        cleanHandler
      ]
    ]
  };

  return new TBus(selector, Object.assign(op, options));
}
