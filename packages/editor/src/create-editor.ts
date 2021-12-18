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
  textAlignFormatLoader, textIndentFormatLoader, verticalAlignFormatLoader, dirFormatLoader
} from './formatters/_api'
import { Editor } from './editor'
import { Toolbar } from './toolbar/_api'
import {
  boldTool, cleanTool, colorTool, defaultGroupTool, fontFamilyTool, fontSizeTool, headingTool,
  historyBackTool,
  historyForwardTool, imageTool, insertParagraphAfterTool, insertParagraphBeforeTool,
  italicTool, linkTool, olTool,
  strikeThroughTool, tableAddTool, tableRemoveTool, textAlignTool, textBackgroundTool, textIndentTool, ulTool,
  underlineTool, unlinkTool
} from './toolbar/tools/_api'
import { LinkJumpTipPlugin } from './plugins/_api'

export const defaultOptions: EditorOptions = {
  editingStyleSheets: [
    `[style*=color]:not([style*=background-color])
   a {color: inherit;}`,
    `a {text-decoration: underline; color: #449fdb; cursor: text;}`
  ],
  componentLoaders: [
    audioComponentLoader,
    blockComponentLoader,
    blockquoteComponentLoader,
    headingComponentLoader,
    imageComponentLoader,
    listComponentLoader,
    paragraphComponentLoader,
    preComponentLoader,
    tableComponentLoader,
    videoComponentLoader
  ],
  formatLoaders: [
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
  ],
  plugins: [
    new Toolbar([
      [historyBackTool, historyForwardTool],
      [defaultGroupTool],
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
      [cleanTool]
    ]),
    new LinkJumpTipPlugin()
  ]
}

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  return new Editor(selector, {
    ...defaultOptions,
    ...options
  })
}
