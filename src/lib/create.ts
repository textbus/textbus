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
  cleanHandler
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
        tableHandler
      ], [
        cleanHandler
      ]
    ]
  };

  return new Editor(selector, Object.assign(op, options));
}
