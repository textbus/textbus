import { EditorOptions, Editor } from './lib/editor';
import {
  fontFamilyFormatter,
  boldFormatter,
  linkFormatter,
  colorFormatter,
  fontSizeFormatter,
  italicFormatter,
  letterSpacingFormatter,
  lineHeightFormatter,
  strikeThroughFormatter,
  subscriptFormatter,
  superscriptFormatter,
  textAlignFormatter,
  textIndentFormatter,
  underlineFormatter,
  blockBackgroundColorFormatter,
  codeFormatter,
  backgroundColorFormatter,
  dirFormatter
} from './lib/formatter/_api';
import {
  audioTool,
  blockBackgroundTool,
  blockquoteTool,
  boldTool,
  cleanTool,
  preTool,
  colorTool,
  emojiTool,
  fontFamilyTool,
  fontSizeTool,
  headingTool,
  historyBackTool,
  historyForwardTool,
  imageTool,
  italicTool,
  letterSpacingTool,
  lineHeightTool,
  linkTool,
  olTool,
  strikeThroughTool,
  subscriptTool,
  superscriptTool,
  tableEditTool,
  tableTool,
  textAlignTool,
  textBackgroundTool,
  textIndentTool,
  ulTool,
  underlineTool,
  videoTool,
  codeTool,
  leftToRightTool,
  rightToLeftTool
} from './lib/toolbar/tools/_api';
import { DefaultHook, HistoryHook, ImageVideoResizeHook, TableEditHook } from './lib/hooks/_api';
import {
  AudioTemplateTranslator,
  BlockTemplateTranslator,
  CodeTemplateTranslator,
  ImageTemplateTranslator,
  ListTemplateTranslator,
  SingleTagTemplateTranslator,
  TableTemplateTranslator,
  VideoTemplateTranslator
} from './lib/templates/_api';
import { defaultStyleSheets } from './lib/workbench/default-styles';
import {
  imageCardStyleSheet,
  imageCardTemplateExample,
  ImageCardTemplateTranslator,

  todoListStyleSheet,
  todoListTemplateExample,
  TodoListTemplateTranslator,

  gaodeMapStyleSheet,
  gaodeMapTemplateExample,
  BaiduMapTemplateTranslator
} from './lib/extend-templates/_api';

export const defaultOptions: EditorOptions = {
  styleSheets: [...defaultStyleSheets, imageCardStyleSheet, todoListStyleSheet, gaodeMapStyleSheet],
  hooks: [
    new DefaultHook(),
    new HistoryHook(),
    new ImageVideoResizeHook(),
    new TableEditHook()
  ],
  templateTranslators: [
    new BaiduMapTemplateTranslator(),
    new TodoListTemplateTranslator(),
    new ImageCardTemplateTranslator(),
    new ListTemplateTranslator('ul'),
    new ListTemplateTranslator('ol'),
    new BlockTemplateTranslator('div,p,h1,h2,h3,h4,h5,h6,blockquote,nav,header,footer'.split(',')),
    new SingleTagTemplateTranslator('br'),
    new CodeTemplateTranslator(),
    new AudioTemplateTranslator(),
    new VideoTemplateTranslator(),
    new ImageTemplateTranslator(),
    new TableTemplateTranslator()
  ],
  formatters: [
    fontFamilyFormatter,
    boldFormatter,
    linkFormatter,
    backgroundColorFormatter,
    // blockBackgroundColorFormatter,
    codeFormatter,
    colorFormatter,
    fontSizeFormatter,
    italicFormatter,
    letterSpacingFormatter,
    lineHeightFormatter,
    strikeThroughFormatter,
    subscriptFormatter,
    superscriptFormatter,
    textAlignFormatter,
    textIndentFormatter,
    underlineFormatter,
    dirFormatter,
  ],
  toolbar: [
    [historyBackTool, historyForwardTool],
    [headingTool],
    [boldTool, italicTool, strikeThroughTool, underlineTool],
    [blockquoteTool, codeTool],
    [preTool],
    [olTool, ulTool],
    [fontSizeTool, lineHeightTool, letterSpacingTool, textIndentTool],
    [subscriptTool, superscriptTool],
    [leftToRightTool, rightToLeftTool],
    [colorTool, textBackgroundTool, /*blockBackgroundTool,*/ emojiTool],
    [fontFamilyTool],
    [linkTool, imageTool, audioTool, videoTool],
    [textAlignTool],
    [tableTool, tableEditTool],
    [cleanTool]
  ],
  templateExamples: [
    imageCardTemplateExample,
    todoListTemplateExample,
    gaodeMapTemplateExample
  ]
};

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  return new Editor(selector, Object.assign(defaultOptions, options));
}
