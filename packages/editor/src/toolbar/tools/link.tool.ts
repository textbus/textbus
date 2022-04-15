import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, Selection } from '@textbus/core'

import { Form, FormRadio, FormTextField } from '../../uikit/forms/_api'
import { linkFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api'


export function linkToolConfigFactory(injector: Injector): DropdownToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  const childI18n = i18n.getContext('plugins.toolbar.linkTool.view')
  const form = new Form({
    mini: true,
    items: [
      new FormTextField({
        label: childI18n.get('linkLabel'),
        name: 'href',
        placeholder: childI18n.get('linkInputPlaceholder'),
        validateFn(value: any) {
          const a = document.createElement('a')
          a.href = value
          if (a.hostname) {
            return false
          }
          return childI18n.get('invalidMessage')
        }
      }),
      new FormRadio({
        label: childI18n.get('jumpLabel'),
        name: 'target',
        values: [{
          label: childI18n.get('jumpSelfLabel'),
          value: '_self',
          default: true
        }, {
          label: childI18n.get('jumpBlankLabel'),
          value: '_blank'
        }]
      })
    ]
  })
  return {
    iconClasses: ['textbus-icon-link'],
    tooltip: i18n.get('plugins.toolbar.linkTool.tooltip'),
    viewController: form,
    queryState(): QueryState<any> {
      return query.queryFormat(linkFormatter)
    },
    useValue(value: any) {
      if (selection.isCollapsed) {
        const slot = selection.startSlot!
        slot.getFormatRangesByFormatter(linkFormatter, 0, slot.length).filter(f => {
          return f.startIndex < selection.startOffset! && f.endIndex >= selection.endOffset!
        }).forEach(f => {
          slot.retain(f.startIndex)
          slot.retain(f.endIndex - f.startIndex, linkFormatter, value)
        })
      }
      commander.applyFormat(linkFormatter, value)
    }
  }
}

export function linkTool() {
  return new DropdownTool(linkToolConfigFactory)
}
