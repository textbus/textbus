import { Component, Formatter } from '@textbus/core'
import { ComponentLoader, FormatLoader } from '@textbus/browser'

import { EditorOptions } from './types'
import {
  blockComponentLoader,
  blockquoteComponentLoader,
  headingComponentLoader,
  imageComponentLoader,
  listComponentLoader,
  paragraphComponentLoader,
  preComponentLoader,
  tableComponentLoader,
  audioComponentLoader,
  videoComponentLoader,
  imageCardComponentLoader,
  todolistComponentLoader,
  katexComponentLoader,
  wordExplainComponentLoader,
  timelineComponentLoader,
  stepComponentLoader,
  alertComponentLoader,
  jumbotronComponentLoader,
  timelineComponent,
  headingComponent,
  wordExplainComponent,
  alertComponent,
  imageCardComponent,
  blockComponent,
  stepComponent,
  katexComponent,
  imageComponent,
  preComponent,
  audioComponent,
  tableComponent,
  videoComponent,
  jumbotronComponent,
  listComponent, todolistComponent, blockquoteComponent, paragraphComponent,
} from './components/_api'
import {
  boldFormatLoader,
  italicFormatLoader,
  colorFormatLoader,
  fontFamilyFormatLoader,
  fontSizeFormatLoader,
  letterSpacingFormatLoader,
  lineHeightFormatLoader,
  strikeThroughFormatLoader,
  subscriptFormatLoader,
  superscriptFormatLoader,
  underlineFormatLoader,
  codeFormatLoader,
  blockBackgroundColorFormatLoader,
  linkFormatLoader,
  textBackgroundColorFormatLoader,
  textAlignFormatLoader,
  textIndentFormatLoader,
  verticalAlignFormatLoader,
  dirFormatLoader,
  boldFormatter,
  lineHeightFormatter,
  textBackgroundColorFormatter,
  textIndentFormatter,
  strikeThroughFormatter,
  verticalAlignFormatter,
  fontSizeFormatter,
  italicFormatter,
  textAlignFormatter,
  dirFormatter,
  superscriptFormatter,
  fontFamilyFormatter,
  subscriptFormatter,
  codeFormatter,
  letterSpacingFormatter,
  colorFormatter,
  linkFormatter,
  underlineFormatter,
  blockBackgroundColorFormatter
} from './formatters/_api'
import { Editor } from './editor'
import {
  Toolbar,
  boldTool, cleanTool, colorTool, defaultGroupTool, fontFamilyTool, fontSizeTool, headingTool,
  historyBackTool,
  historyForwardTool, imageTool, insertParagraphAfterTool, insertParagraphBeforeTool,
  italicTool, linkTool, olTool,
  strikeThroughTool, tableAddTool, tableRemoveTool, textAlignTool, textBackgroundTool, textIndentTool, ulTool,
  underlineTool, unlinkTool, ToolFactory, componentsTool, formatPainterTool
} from './toolbar/_api'
import { LinkJumpTipPlugin, ContextMenu } from './plugins/_api'

export const defaultComponentLoaders: ComponentLoader[] = [
  imageCardComponentLoader,
  todolistComponentLoader,
  katexComponentLoader,
  wordExplainComponentLoader,
  timelineComponentLoader,
  stepComponentLoader,
  alertComponentLoader,
  jumbotronComponentLoader,
  audioComponentLoader,
  blockComponentLoader,
  blockquoteComponentLoader,
  headingComponentLoader,
  imageComponentLoader,
  listComponentLoader,
  paragraphComponentLoader,
  preComponentLoader,
  tableComponentLoader,
  videoComponentLoader,
]

export const defaultFormatLoaders: FormatLoader[] = [
  boldFormatLoader,
  italicFormatLoader,
  colorFormatLoader,
  fontFamilyFormatLoader,
  fontSizeFormatLoader,
  letterSpacingFormatLoader,
  lineHeightFormatLoader,
  strikeThroughFormatLoader,
  subscriptFormatLoader,
  superscriptFormatLoader,
  underlineFormatLoader,
  codeFormatLoader,
  blockBackgroundColorFormatLoader,
  linkFormatLoader,
  textBackgroundColorFormatLoader,
  textAlignFormatLoader,
  textIndentFormatLoader,
  verticalAlignFormatLoader,
  dirFormatLoader
]

export const defaultComponents: Component[] = [
  audioComponent,
  blockComponent,
  blockquoteComponent,
  headingComponent,
  imageComponent,
  listComponent,
  paragraphComponent,
  preComponent,
  tableComponent,
  videoComponent,
  imageCardComponent,
  todolistComponent,
  katexComponent,
  wordExplainComponent,
  timelineComponent,
  stepComponent,
  alertComponent,
  jumbotronComponent
]
export const defaultFormatters: Formatter[] = [
  boldFormatter,
  italicFormatter,
  colorFormatter,
  fontFamilyFormatter,
  fontSizeFormatter,
  letterSpacingFormatter,
  lineHeightFormatter,
  strikeThroughFormatter,
  subscriptFormatter,
  superscriptFormatter,
  underlineFormatter,
  codeFormatter,
  blockBackgroundColorFormatter,
  linkFormatter,
  textBackgroundColorFormatter,
  textAlignFormatter,
  textIndentFormatter,
  verticalAlignFormatter,
  dirFormatter,
]

export const defaultOptions: EditorOptions = {
  editingStyleSheets: [
    `[textbus-document=true] [style*=color]:not([style*=background-color])
     [textbus-document=true] a {color: inherit;}
     [textbus-document=true] a {text-decoration: underline; color: #449fdb; cursor: text;}
     [textbus-document=true] {line-height: 1.5}`
  ],
  components: defaultComponents,
  formatters: defaultFormatters,
  componentLoaders: defaultComponentLoaders,
  formatLoaders: defaultFormatLoaders
}

export const defaultTools: ToolFactory[][] = [
  [historyBackTool, historyForwardTool],
  [defaultGroupTool],
  [componentsTool],
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
  [tableAddTool, tableRemoveTool],
  [formatPainterTool],
  [cleanTool]
]

export function createEditor(options: EditorOptions = {}) {
  return new Editor({
    plugins: [
      () => new Toolbar(defaultTools),
      () => new LinkJumpTipPlugin(),
      () => new ContextMenu()
    ],
    ...defaultOptions,
    ...options
  })
}
