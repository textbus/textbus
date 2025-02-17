import { Component } from './component'

import { Textbus } from '../textbus'
import { makeError } from '../_utils/make-error'
import { EventCache, eventCacheMap, EventTypes, onDestroy } from './on-events'

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
  const context: ComponentContext = {
    textbus,
    componentInstance: component,
    eventCache: new EventCache<EventTypes>(),
  }
  contextStack.push(context)
  if (typeof component.setup === 'function') {
    component.setup()
  }

  onDestroy(() => {
    eventCacheMap.delete(component)
  })
  eventCacheMap.set(component, context.eventCache)
  contextStack.pop()
}
