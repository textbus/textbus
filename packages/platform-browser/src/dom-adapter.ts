import { Adapter } from '@textbus/core'
import { Subject } from '@tanbo/stream'

import { createElement } from './_utils/uikit'
import { VIEW_DOCUMENT } from './injection-tokens'

export abstract class DomAdapter<
  ViewComponent extends object = object,
  ViewElement extends object = object> extends Adapter<HTMLElement, Node, ViewComponent, ViewElement> {
  onViewUpdated = new Subject<void>()
  host = createElement('div', {
    styles: {
      cursor: 'text',
      wordBreak: 'break-all',
      boxSizing: 'border-box',
      flex: 1,
      outline: 'none'
    },
    attrs: {
      'data-textbus-view': VIEW_DOCUMENT,
    },
    props: {
      id: 'textbus-' + Number((Math.random() + '').substring(2)).toString(16)
    }
  })
}
