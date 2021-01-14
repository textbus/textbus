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
  boldTool,
  cleanTool,
  colorTool,
  fontFamilyTool,
  fontSizeTool,
  headingTool,
  historyBackTool,
  historyForwardTool,
  imageTool,
  italicTool,
  insertParagraphAfterTool,
  insertParagraphBeforeTool,
  linkTool,
  olTool,
  strikeThroughTool,
  textAlignTool,
  textBackgroundTool,
  textIndentTool,
  ulTool,
  underlineTool,
  unlinkTool,
  findTool,
  insertObjectTool,
  tableTool
} from './lib/toolbar/tools/_api';
import { FindPlugin, ImageVideoResizePlugin, TableEditPlugin } from './lib/plugins/_api';
import {
  imageCardComponentExample,
  todoListComponentExample,
  baiduMapComponentExample,
  jumbotronComponentExample,
  wordExplainComponentExample,
  timelineComponentExample,
  progressComponentExample,
  stepsComponentExample,

  StepComponent,
  ProgressComponent,
  TimelineComponent,
  WordExplainComponent,
  JumbotronComponent,
  BaiduMapComponent,
  TodoListComponent,
  ImageCardComponent
} from './lib/additional-components/_api';
import { HTMLOutputTranslator } from './lib/output-translator';
import {
  ListComponent,
  BlockComponent,
  BrComponent,
  PreComponent,
  AudioComponent,
  VideoComponent,
  ImageComponent,
  TableComponent
} from './lib/components/_api';

export const defaultOptions: EditorOptions<string> = {
  editingStyleSheets: [
    `[style*=color]:not([style*=background-color])
   a {color: inherit;}`,
    `a {text-decoration: underline; color: #449fdb; cursor: text;}`
  ],
  deviceOptions: [{
    label: 'PC',
    value: '100%',
    default: true,
  }, {
    label: 'iPhone5/SE',
    value: '320px'
  }, {
    label: 'iPhone6/7/8/X',
    value: '375px'
  }, {
    label: 'iPhone6/7/8 Plus',
    value: '414px'
  }, {
    label: 'iPad',
    value: '768px'
  }, {
    label: 'iPad Pro',
    value: '1024px'
  }, {
    label: 'A4',
    value: '842px'
  }],
  components: [
    StepComponent,
    ProgressComponent,
    TimelineComponent,
    WordExplainComponent,
    JumbotronComponent,
    BaiduMapComponent,
    TodoListComponent,
    ImageCardComponent,
    ListComponent,
    BlockComponent,
    BrComponent,
    PreComponent,
    AudioComponent,
    VideoComponent,
    ImageComponent,
    TableComponent
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
    [insertObjectTool],
    [headingTool],
    [boldTool, italicTool, strikeThroughTool, underlineTool],
    [olTool, ulTool],
    [fontSizeTool, textIndentTool],
    [colorTool, textBackgroundTool],
    [insertParagraphBeforeTool, insertParagraphAfterTool],
    [fontFamilyTool],
    [linkTool, unlinkTool],
    [imageTool],
    [textAlignTool],
    [tableTool],
    [findTool],
    [cleanTool]
  ],
  plugins: [
    new FindPlugin(),
    new ImageVideoResizePlugin(),
    new TableEditPlugin()
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
  ],
  outputTranslator: new HTMLOutputTranslator()
};

export function createEditor<T = string>(selector: string | HTMLElement, options: EditorOptions<T> = {}) {
  return new Editor<T>(selector, {
    ...defaultOptions as EditorOptions<any>,
    ...options as EditorOptions<any>
  });
}
