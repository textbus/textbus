import { Injector } from '@tanbo/di'
import { Commander, onEnter, Slots, TBSelection } from '@textbus/core'

import { paragraphComponent } from '../paragraph.component'

export function useEnterBreaking(injector: Injector, slots: Slots) {
  const selection = injector.get(TBSelection)
  const commander = injector.get(Commander)
  onEnter(ev => {
    const parentComponent = selection.commonAncestorComponent!
    const parentSlot = parentComponent.parent!

    const index = parentSlot.indexOf(parentComponent)
    selection.setLocation(parentSlot, index + 1)
    const component = paragraphComponent.createInstance(injector, slots.get(0)!.cut(ev.data.index))
    commander.insert(component)
    selection.setLocation(component.slots.get(0)!, 0)
    ev.preventDefault()
  })
}
