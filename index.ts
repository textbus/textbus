import './index.scss';
import {
  Editor,
  EditorOptions,
  createEditor,
  ListComponent, // ul、ol 列表组件
  BlockComponent, // 支持 div,p,h1,h2,h3,h4,h5,h6,blockquote,article,section,nav,header,footer 的块级元素组件
  PreComponent, // 代码块组件
  AudioComponent, // 音频组件
  VideoComponent, // 视频组件
  ImageComponent, // 图片组件
  TableComponent, // 表格组件
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
  fontFamilyFormatter, // 字体
  boldFormatter, // 加粗
  linkFormatter, // 超链接
  backgroundColorFormatter, // 文字背景颜色
  blockBackgroundColorFormatter, // 块背景颜色
  codeFormatter, // 行内代码
  colorFormatter, // 字体颜色
  fontSizeFormatter, // 字体大小
  italicFormatter, // 斜体
  letterSpacingFormatter, // 文字间距
  lineHeightFormatter, // 行高
  strikeThroughFormatter, // 中划线
  subscriptFormatter, // 上角标
  superscriptFormatter, // 下角标
  textAlignFormatter, // 文字对齐方式
  textIndentFormatter, // 首行缩进
  underlineFormatter, // 下划线
  dirFormatter, // 内容排版方向
  tdBorderColorFormatter, // 表格边框颜色
  Toolbar,
  TOOLS,
  historyBackTool,
  historyForwardTool,
  insertObjectTool,
  headingTool,
  boldTool,
  italicTool,
  strikeThroughTool,
  underlineTool,
  olTool,
  ulTool,
  fontSizeTool,
  textIndentTool,
  colorTool,
  textBackgroundTool,
  insertParagraphBeforeTool,
  insertParagraphAfterTool,
  fontFamilyTool,
  linkTool,
  unlinkTool,
  imageTool,
  textAlignTool,
  tableTool,
  findTool,
  cleanTool,
  ComponentLibraryPlugin,
  ContextmenuPlugin,
  PasteUploadEmitterPlugin,
  GuardEndBlockPlugin,
  OutlinesPlugin,
  ImageAndVideoDragResizePlugin, // 图片视频拖拽缩放插件
  LinkJumpTipPlugin, // 超链接点击弹出跳转 tip 插件
  TableEditEnhancePlugin, // 表格框选编辑支持插件
  SourcecodeModePlugin, // 源代码编辑模式插件
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
  COMPONENT_CREATORS,
  i18n_zh_CN,
} from "@textbus/textbus"
console.log(i18n_zh_CN)
const options: EditorOptions = {
  theme: "dark", // 可选 'dark' | 'mac-os' | 'mac-os-dark'，不传即为默认样式
  i18n: i18n_zh_CN,
  contents: "<p>欢迎你使用 <strong>TextBus 富文本编辑器！</strong></p>",
  providers: [
    {
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
    }
  ],
  plugins: [
    Toolbar,
  ],
  components: [
    ListComponent, // ul、ol 列表组件
    BlockComponent, // 支持 div,p,h1,h2,h3,h4,h5,h6,blockquote,article,section,nav,header,footer 的块级元素组件
    PreComponent, // 代码块组件
    AudioComponent, // 音频组件
    VideoComponent, // 视频组件
    ImageComponent, // 图片组件
    TableComponent  // 表格组件
  ],
  formatters: [
    fontFamilyFormatter, // 字体
    boldFormatter, // 加粗
    linkFormatter, // 超链接
    backgroundColorFormatter, // 文字背景颜色
    blockBackgroundColorFormatter, // 块背景颜色
    codeFormatter, // 行内代码
    colorFormatter, // 字体颜色
    fontSizeFormatter, // 字体大小
    italicFormatter, // 斜体
    letterSpacingFormatter, // 文字间距
    lineHeightFormatter, // 行高
    strikeThroughFormatter, // 中划线
    subscriptFormatter, // 上角标
    superscriptFormatter, // 下角标
    textAlignFormatter, // 文字对齐方式
    textIndentFormatter, // 首行缩进
    underlineFormatter, // 下划线
    dirFormatter, // 内容排版方向
    tdBorderColorFormatter // 表格边框颜色
  ]
}
// @ts-ignore
const editor = createEditor(document.getElementById("editor"), options)

editor.onChange.subscribe(() => {
  console.log(editor.getContents())
})
