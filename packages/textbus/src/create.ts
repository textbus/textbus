import { Editor, EditorOptions } from '@textbus/core';
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
  tableTool,

  Toolbar,
  TOOLS,
  ToolFactory
} from '@textbus/toolbar';
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
} from '@textbus/formatters';
import {
  ListComponent,
  BlockComponent,
  PreComponent,
  AudioComponent,
  VideoComponent,
  ImageComponent,
  TableComponent
} from '@textbus/components';

import { DEVICE_OPTIONS, DeviceOption, DeviceTogglePlugin } from '@textbus/device-toggle-plugin';
import { i18n_zh_CN } from './i18n/_api'
import {
  AlertComponent,
  alertComponentExample, BaiduMapComponent,
  baiduMapComponentExample, COMPONENT_CREATORS,
  ComponentCreator, ComponentLibraryPlugin, ImageCardComponent,
  imageCardComponentExample, JumbotronComponent,
  jumbotronComponentExample, KatexComponent,
  katexComponentExample, ProgressComponent,
  progressComponentExample, StepComponent,
  stepsComponentExample, TimelineComponent,
  timelineComponentExample, TodoListComponent,
  todoListComponentExample, WordExplainComponent,
  wordExplainComponentExample
} from '@textbus/component-library-plugin';
import { ContextmenuPlugin } from '@textbus/contextmenu-plugin';
import { PasteUploadEmitterPlugin } from '@textbus/paste-upload-emitter-plugin';
import { GuardEndBlockPlugin } from '@textbus/guard-end-block-plugin';
import { OutlinesPlugin } from '@textbus/outlines-plugin';
import { FullScreenPlugin } from '@textbus/full-screen-plugin';
import { ImageAndVideoDragResizePlugin } from '@textbus/image-and-video-drag-resize-plugin';
import { LinkJumpTipPlugin } from '@textbus/link-jump-tip-plugin';
import { TableEditEnhancePlugin } from '@textbus/table-edit-enhance-plugin';
import { SourcecodeModePlugin } from '@textbus/sourcecode-mode-plugin';

export const defaultTools: Array<ToolFactory | ToolFactory[]> = [
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
];

export const defaultDeviceOptions: DeviceOption[] = [{
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
}];

export const defaultComponentLibrary: ComponentCreator[] = [
  imageCardComponentExample,
  todoListComponentExample,
  baiduMapComponentExample,
  jumbotronComponentExample,
  wordExplainComponentExample,
  katexComponentExample,
  timelineComponentExample,
  stepsComponentExample,
  progressComponentExample,
  alertComponentExample,
];

export const defaultOptions: EditorOptions = {
  editingStyleSheets: [
    `[style*=color]:not([style*=background-color])
   a {color: inherit;}`,
    `a {text-decoration: underline; color: #449fdb; cursor: text;}`
  ],
  i18n: i18n_zh_CN,
  components: [
    AlertComponent,
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
    useValue: defaultTools
  }, {
    provide: DEVICE_OPTIONS,
    useValue: defaultDeviceOptions
  }, {
    provide: COMPONENT_CREATORS,
    useValue: defaultComponentLibrary
  }],
  plugins: [
    Toolbar,
    ComponentLibraryPlugin,
    ContextmenuPlugin,
    PasteUploadEmitterPlugin,
    GuardEndBlockPlugin,
    OutlinesPlugin,
    FullScreenPlugin,
    DeviceTogglePlugin,
    ImageAndVideoDragResizePlugin,
    LinkJumpTipPlugin,
    TableEditEnhancePlugin,
    SourcecodeModePlugin,
  ]
};

BlockComponent.cleanedFormatters.push(linkFormatter);

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  return new Editor(selector, {
    ...defaultOptions as EditorOptions,
    ...options as EditorOptions
  });
}
