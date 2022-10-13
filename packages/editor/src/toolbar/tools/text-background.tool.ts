import { Injector } from '@tanbo/di'

import { SegmentDropdownTool, SegmentDropdownToolConfig } from '../toolkit/_api'
import { Palette } from './_utils/palette'
import { I18n } from '../../i18n'
import { textBackgroundColorFormatter } from '../../formatters/_api'
import { colorToolCreator } from './_utils/color-tool-creator'

export function textBackgroundToolConfigFactory(injector: Injector): SegmentDropdownToolConfig {
  const i18n = injector.get(I18n).getContext('plugins.toolbar.textBackgroundColorTool')
  const palette = new Palette('color',
    i18n.get('view.btnText'),
    i18n.get('view.recentText'),
    i18n.get('view.backText'),
    i18n.get('view.paletteText'),
  )
  return {
    iconClasses: ['textbus-icon-background-color'],
    tooltip: i18n.get('tooltip'),
    ...colorToolCreator(injector, palette, textBackgroundColorFormatter)
  }
}

export function textBackgroundTool() {
  return new SegmentDropdownTool(textBackgroundToolConfigFactory)
}
