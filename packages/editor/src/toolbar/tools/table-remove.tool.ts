import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { tableComponent } from '../../components/table.component'

export function tableRemoveToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    iconClasses: ['textbus-icon-table-remove'],
    tooltip: i18n.get('plugins.toolbar.tableRemoveTool.tooltip'),
    queryState(): QueryState<any> {
      const s = query.queryComponent(tableComponent)
      if (s.state !== QueryStateType.Enabled) {
        s.state = QueryStateType.Disabled
      } else if (s.state === QueryStateType.Enabled) {
        s.state = QueryStateType.Normal
      }
      return s
    },
    onClick() {
      const s = query.queryComponent(tableComponent)
      if (s.state === QueryStateType.Enabled) {
        commander.removeComponent(s.value!)
      }
    }
  }
}

export function tableRemoveTool() {
  return new ButtonTool(tableRemoveToolConfigFactory)
}
