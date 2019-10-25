import { Editor } from './lib/editor';
import { EditorOptions } from './lib/help';
import {
  historyBackHandler,
  historyForwardHandler,
  hHandler,
  boldHandler,
  italicHandler,
  strikeThroughHandler,
  underlineHandler,
  blockquoteHandler,
  codeHandler,
  olHandler,
  ulHandler,
  superscriptHandler,
  subscriptHandler,
  colorHandler,
  backgroundHandler,
  fontFamilyHandler,
  linkHandler,
  imageHandler,
  musicHandler,
  videoHandler,
  alignHandler,
  tableHandler,
  tableEditHandler,
  cleanHandler, fontSizeHandler, lineHeightHandler, textWidthHandler
} from './lib/formats/_api';

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
        textWidthHandler
      ], [
        superscriptHandler,
        subscriptHandler
      ], [
        colorHandler,
        backgroundHandler
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

  return new Editor(selector, Object.assign(op, options));
}
