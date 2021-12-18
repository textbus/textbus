import { Injector } from '@tanbo/di'

import { SegmentDropdownTool, SegmentDropdownToolConfig } from '../toolkit/_api'
import { Palette } from './_utils/palette'
import { I18n } from '../../i18n'
import { textBackgroundColorFormatter } from '../../formatters/_api'
import { colorToolCreator } from './_utils/color-tool-creator'

export function textBackgroundToolConfigFactory(injector: Injector): SegmentDropdownToolConfig {
  const i18n = injector.get(I18n)
  const palette = new Palette('color', i18n.get('plugins.toolbar.textBackgroundColorTool.view.confirmBtnText'))
  return {
    iconClasses: ['textbus-icon-background-color'],
    tooltip: i18n.get('plugins.toolbar.textBackgroundColorTool.tooltip'),
    ...colorToolCreator(injector, palette, textBackgroundColorFormatter)
  }
}

export const textBackgroundTool = new SegmentDropdownTool(textBackgroundToolConfigFactory)
