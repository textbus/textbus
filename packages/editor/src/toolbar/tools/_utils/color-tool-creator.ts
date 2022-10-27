import { Query, QueryState, Commander, Formatter } from '@textbus/core'
import { Injector } from '@tanbo/di'
import { Observable } from '@tanbo/stream'

import { Palette } from './palette'
import { UISegmentDropdown } from '../../toolkit/_utils/_api'

export function colorToolCreator(injector: Injector, palette: Palette, formatter: Formatter<any>) {
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  let viewer!: UISegmentDropdown
  return {
    viewController: {
      elementRef: palette.elementRef,
      onComplete: palette.onComplete,
      onCancel: new Observable<void>(),
      reset() {
        palette.update()
      },
      update(newValue: any) {
        palette.update(newValue)
      }
    },
    onInit(ui: UISegmentDropdown) {
      viewer = ui
    },
    useValue(value: any) {
      viewer.leftButton.style.color = value
      commander.applyFormat(formatter, value)
    },
    queryState(): QueryState<any> {
      return query.queryFormat(formatter)
    }
  }
}
