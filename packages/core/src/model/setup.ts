import { Component } from './component'

import { Textbus } from '../textbus'
import { makeError } from '../_utils/make-error'
import { EventCache, eventCacheMap, EventTypes, onDetach } from './on-events'

const componentErrorFn = makeError('Component')

interface ComponentContext {
  textbus: Textbus
  componentInstance: Component
  // dynamicShortcut: Shortcut[]
  eventCache: EventCache<EventTypes>
}


const contextStack: ComponentContext[] = []

export function getCurrentContext() {
  const current = contextStack[contextStack.length - 1]
  if (!current) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return current
}

export function setup(textbus: Textbus, component: Component<any>) {
  if (component.textbus) {
    return
  }
  const context: ComponentContext = {
    textbus,
    componentInstance: component,
    eventCache: new EventCache<EventTypes>(),
  }
  contextStack.push(context)
  component.textbus = textbus
  onDetach(() => {
    eventCacheMap.delete(component)
  })
  if (typeof component.setup === 'function') {
    component.setup()
  }

  component.slots.forEach(slot => {
    slot.sliceContent().forEach(i => {
      if (i instanceof Component) {
        setup(textbus, i)
      }
    })
  })

  eventCacheMap.set(component, context.eventCache)
  contextStack.pop()
}
