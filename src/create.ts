import { Editor } from './lib/editor';
import { EditorOptions } from './lib/editor-options';
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
  tdBorderColorFormatter,
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
} from './lib/ui/toolbar/tools/_api';
import {
  imageCardComponentExample,
  todoListComponentExample,
  baiduMapComponentExample,
  jumbotronComponentExample,
  wordExplainComponentExample,
  timelineComponentExample,
  progressComponentExample,
  stepsComponentExample,
  katexComponentExample,

  StepComponent,
  ProgressComponent,
  TimelineComponent,
  WordExplainComponent,
  JumbotronComponent,
  BaiduMapComponent,
  TodoListComponent,
  ImageCardComponent,
  KatexComponent
} from './lib/components/extensions/_api';
import {
  ListComponent,
  BlockComponent,
  PreComponent,
  AudioComponent,
  VideoComponent,
  ImageComponent,
  TableComponent
} from './lib/components/_api';
import {
  COMPONENT_CREATORS,
  ComponentStagePlugin,
  DevicePlugin,
  DEVICE_OPTIONS,
  FullScreenPlugin,
  ImageVideoResizePlugin, LinkJumpPlugin, TableEditPlugin,
  TOOLS
} from './lib/ui/_api';
import { Toolbar } from './lib/ui/toolbar/_api';

export const defaultOptions: EditorOptions = {
  editingStyleSheets: [
    `[style*=color]:not([style*=background-color])
   a {color: inherit;}`,
    `a {text-decoration: underline; color: #449fdb; cursor: text;}`
  ],
  components: [
    KatexComponent,
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
    tdBorderColorFormatter,
  ],
  providers: [{
    provide: TOOLS,
    useValue: [
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
    ]
  }, {
    provide: DEVICE_OPTIONS,
    useValue: [{
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
    }]
  }, {
    provide: COMPONENT_CREATORS,
    useValue: [
      imageCardComponentExample,
      todoListComponentExample,
      baiduMapComponentExample,
      jumbotronComponentExample,
      wordExplainComponentExample,
      timelineComponentExample,
      progressComponentExample,
      stepsComponentExample,
      katexComponentExample,
    ]
  }],
  plugins: [
    Toolbar,
    FullScreenPlugin,
    DevicePlugin,
    ComponentStagePlugin,
    ImageVideoResizePlugin,
    LinkJumpPlugin,
    TableEditPlugin
  ]
};

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  return new Editor(selector, {
    ...defaultOptions as EditorOptions,
    ...options as EditorOptions
  });
}
