import { Injector } from '@tanbo/di'

import { SegmentDropdownTool, SegmentDropdownToolConfig } from '../toolkit/_api'
import { colorFormatter } from '../../formatters/_api'
import { Palette } from './_utils/palette'
import { I18n } from '../../i18n'
import { colorToolCreator } from './_utils/color-tool-creator'

export function colorToolConfigFactory(injector: Injector): SegmentDropdownToolConfig {
  const i18n = injector.get(I18n)
  const palette = new Palette('color', i18n.get('plugins.toolbar.colorTool.view.btnText'))

  return {
    iconClasses: ['textbus-icon-color'],
    tooltip: i18n.get('plugins.toolbar.colorTool.tooltip'),
    keymap: {
      ctrlKey: true,
      shiftKey: true,
      key: 'c'
    },
    ...colorToolCreator(injector, palette, colorFormatter)
  }
}

export function colorTool() {
  return new SegmentDropdownTool(colorToolConfigFactory)
}
