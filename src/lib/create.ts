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
  dirFormatter,
  tdBorderColorFormatter
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
  rightToLeftTool,
  tableAddParagraphTool,
  tableRemoveTool,
  tdBorderColorTool,
  unlinkTool,
  findTool
} from './lib/toolbar/tools/_api';
import { DefaultHook, FindHook, HistoryHook, ImageVideoResizeHook, TableEditHook } from './lib/hooks/_api';
import {
  AudioComponentReader,
  BlockComponentReader,
  PreComponentReader,
  ImageComponentReader,
  ListComponentReader,
  BrComponentReader,
  TableComponentReader,
  VideoComponentReader
} from './lib/components/_api';
import { defaultStyleSheets } from './lib/viewer/default-styles';
import {
  imageCardStyleSheet,
  imageCardComponentExample,
  ImageCardComponentReader,

  todoListStyleSheet,
  todoListComponentExample,
  TodoListComponentReader,

  baiduMapComponentExample,
  BaiduMapComponentReader,

  JumbotronComponentReader,
  jumbotronComponentExample,
  jumbotronStyleSheet,

  WordExplainComponentReader,
  wordExplainComponentExample,
  wordExplainStyleSheet,
  wordExplainComponentEditingStyleSheet,

  timelineComponentStyleSheet,
  TimelineComponentReader,
  timelineComponentExample,
  timelineComponentEditingStyleSheet,

  progressComponentExample,
  ProgressComponentReader,
  progressComponentStyleSheet,

  stepsComponentExample,
  StepComponentReader,
  stepsComponentStyleSheet,
  stepsComponentEditingStyleSheet
} from './lib/additional-components/_api';

export const defaultOptions: EditorOptions = {
  styleSheets: [
    ...defaultStyleSheets,
    imageCardStyleSheet,
    todoListStyleSheet,
    jumbotronStyleSheet,
    wordExplainStyleSheet,
    timelineComponentStyleSheet,
    progressComponentStyleSheet,
    stepsComponentStyleSheet
  ],
  editingStyleSheets: [
    wordExplainComponentEditingStyleSheet,
    timelineComponentEditingStyleSheet,
    stepsComponentEditingStyleSheet
  ],
  hooks: [
    new DefaultHook(),
    new HistoryHook(),
    new ImageVideoResizeHook(),
    new TableEditHook(),
    new FindHook()
  ],
  componentReaders: [
    new StepComponentReader(),
    new ProgressComponentReader(),
    new TimelineComponentReader(),
    new WordExplainComponentReader(),
    new JumbotronComponentReader(),
    new BaiduMapComponentReader(),
    new TodoListComponentReader(),
    new ImageCardComponentReader(),
    new ListComponentReader('ul'),
    new ListComponentReader('ol'),
    new BlockComponentReader('div,p,h1,h2,h3,h4,h5,h6,blockquote,nav,header,footer'.split(',')),
    new BrComponentReader(),
    new PreComponentReader(),
    new AudioComponentReader(),
    new VideoComponentReader(),
    new ImageComponentReader(),
    new TableComponentReader()
  ],
  formatters: [
    fontFamilyFormatter,
    boldFormatter,
    linkFormatter,
    backgroundColorFormatter,
    blockBackgroundColorFormatter,
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
    tdBorderColorFormatter
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
    [colorTool, textBackgroundTool, blockBackgroundTool, emojiTool],
    [fontFamilyTool],
    [linkTool, unlinkTool],
    [imageTool, audioTool, videoTool],
    [textAlignTool],
    [tableTool, tableEditTool, tdBorderColorTool, tableAddParagraphTool, tableRemoveTool],
    [findTool],
    [cleanTool]
  ],
  componentLibrary: [
    imageCardComponentExample,
    todoListComponentExample,
    baiduMapComponentExample,
    jumbotronComponentExample,
    wordExplainComponentExample,
    timelineComponentExample,
    progressComponentExample,
    stepsComponentExample
  ]
};

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  return new Editor(selector, Object.assign(defaultOptions, options));
}
