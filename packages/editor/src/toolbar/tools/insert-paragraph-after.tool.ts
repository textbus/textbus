import { Injector } from '@tanbo/di'
import { Commander, QueryState, QueryStateType, Selection } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { paragraphComponent } from '../../components/paragraph.component'

export function insertParagraphAfterToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  return {
    iconClasses: ['textbus-icon-insert-paragraph-after'],
    tooltip: i18n.get('plugins.toolbar.insertParagraphAfterTool.tooltip'),
    keymap: {
      ctrlKey: true,
      key: 'p'
    },
    queryState(): QueryState<boolean> {
      if (selection.isSelected) {
        if (selection.commonAncestorComponent?.parent) {
          return {
            state: QueryStateType.Normal,
            value: null
          }
        }
      }
      return {
        state: QueryStateType.Disabled,
        value: null
      }
    },
    onClick() {
      const p = paragraphComponent.createInstance(injector)
      commander.insertAfter(p, selection.commonAncestorComponent!)
      selection.setLocation(p.slots.get(0)!, 0)
    }
  }
}

export const insertParagraphAfterTool = new ButtonTool(insertParagraphAfterToolConfigFactory)
