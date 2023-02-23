import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType, Selection } from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { createCodeSlot, preComponent } from '../../components/pre.component'
import { I18n } from '../../i18n'

export function preToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)
  return {
    iconClasses: ['textbus-icon-source-code'],
    tooltip: i18n.get('plugins.toolbar.preTool.tooltip'),
    mini: true,
    options: [{
      label: 'JavaScript',
      value: 'JavaScript',
    }, {
      label: 'HTML',
      value: 'HTML'
    }, {
      label: 'CSS',
      value: 'CSS'
    }, {
      label: 'TypeScript',
      value: 'TypeScript'
    }, {
      label: 'Java',
      value: 'Java'
    }, {
      label: 'C',
      value: 'C'
    }, {
      label: 'C++',
      value: 'CPP'
    }, {
      label: 'C#',
      value: 'CSharp'
    }, {
      label: 'Swift',
      value: 'Swift'
    }, {
      label: 'Go',
      value: 'Go'
    }, {
      label: 'JSON',
      value: 'JSON'
    }, {
      label: 'Less',
      value: 'Less'
    }, {
      label: 'SCSS',
      value: 'SCSS'
    }, {
      label: 'Stylus',
      value: 'Stylus'
    }, {
      label: 'Jsx',
      value: 'Jsx',
    }, {
      label: 'Tsx',
      value: 'Tsx',
    }, {
      label: i18n.get('plugins.toolbar.preTool.defaultLang'),
      value: '',
      default: true
    }],
    queryState(): QueryState<any> {
      const state = query.queryComponent(preComponent)
      return {
        state: state.state,
        value: state.value ? state.value.toJSON().state.lang : null
      }
    },
    onChecked(value: any) {
      const state = query.queryComponent(preComponent)
      if (state.state === QueryStateType.Enabled) {
        state.value!.updateState(draft => {
          draft.lang = value
        })
      } else {
        const component = preComponent.createInstance(injector, {
          state: {
            lang: value,
            theme: 'light'
          },
          slots: [createCodeSlot()]
        })
        commander.insert(component)
        selection.setPosition(component.slots.get(0)!, 0)
      }
    }
  }
}

export function preTool() {
  return new SelectTool(preToolConfigFactory)
}
