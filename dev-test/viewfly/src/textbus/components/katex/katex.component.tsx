import {
  Component,
  ComponentStateLiteral,
  ContentType, fromEvent,
  Slot,
  Textbus,
} from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { createDynamicRef, createRef, inject, jsx, JSXNode } from '@viewfly/core'
import { ComponentLoader } from '@textbus/platform-browser'
// @ts-ignore
import Katex from 'katex'

import './katex.component.scss'
import { KatexEditor } from './katex-editor'
import { Dropdown } from '../../../components/dropdown/dropdown'
import { useOutput } from '../../hooks/use-output'
import { useReadonly } from '../../hooks/use-readonly'

export interface KatexComponentState {
  text: string
}

export class KatexComponent extends Component<KatexComponentState> {
  static componentName = 'KatexComponent'
  static type = ContentType.InlineComponent

  static fromJSON(textbus: Textbus, state: ComponentStateLiteral<KatexComponentState>) {
    return new KatexComponent(textbus, state)
  }


  constructor(textbus: Textbus, state: KatexComponentState = {
    text: '% \\f is defined as #1f(#2) using the macro\n' +
      '\\f\\relax{x} = \\int_{-\\infty}^\\infty\n' +
      '\\f\\hat\\xi\\,e^{2 \\pi i \\xi x}\n' +
      '\\,d\\xi'
  }) {
    super(textbus, state)
  }

  override getSlots(): Slot[] {
    return []
  }
}

function domToVDom(el: HTMLElement): JSXNode {
  const attrs: { [key: string]: any } = {}
  el.getAttributeNames().forEach(key => {
    attrs[key] = el.getAttribute(key)!
  })
  attrs.children = Array.from(el.childNodes).map(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      return domToVDom(child as HTMLElement)
    }
    return child.textContent || ''
  })

  return jsx(el.tagName.toLowerCase(), attrs)
}

export function KatexComponentView(props: ViewComponentProps<KatexComponent>) {
  function toDOM(value: string) {
    let htmlString: string
    try {
      htmlString = Katex.renderToString(value, {
        displayMode: true,
        leqno: false,
        fleqn: false,
        throwOnError: true,
        errorColor: '#cc0000',
        strict: 'warn',
        output: 'html',
        trust: false,
        macros: { '\\f': '#1f(#2)' }
      })
    } catch (e) {
      htmlString = '<span style="color: red">公式错误</span>'
    }
    return new DOMParser().parseFromString(htmlString, 'text/html').body.children[0] as HTMLElement
  }

  const selection = inject(Textbus)
  const editorRef = createDynamicRef<HTMLElement>(node => {
    const editor = new KatexEditor()

    editor.mount(node, props.component.state.text).then(() => {
      editor.focus()
    })
    selection.blur()

    const subscription = editor.onValueChange.subscribe((value) => {
      props.component.state.text = value
    }).add(
      fromEvent(node, 'mousedown').subscribe(ev => ev.stopPropagation()),
      fromEvent(document, 'mousedown').subscribe(() => {
        dropdownRef.current?.isShow(false)
      })
    )

    return () => {
      subscription.unsubscribe()
      editor.destroy()
    }
  })

  const dropdownRef = createRef<typeof Dropdown>()

  const output = useOutput()
  const readonly = useReadonly()
  return () => {
    const text = props.component.state.text
    return (
      <span onClick={() => {
        dropdownRef.current?.isShow(true)
      }} ref={props.rootRef} data-component={KatexComponent.componentName} data-katex={encodeURIComponent(text)} class="xnote-katex">
       {
         (output() || readonly()) ?
           domToVDom(toDOM(text))
           :
           <Dropdown padding={'0'} ref={dropdownRef} trigger={'none'} width={'600px'} menu={
             <div class="xnote-katex-input" ref={editorRef}>
             </div>
           }>
             {domToVDom(toDOM(text))}
           </Dropdown>
       }
      </span>
    )
  }
}

export const katexComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === KatexComponent.componentName
  },
  read(element: HTMLElement, textbus: Textbus): Component | Slot | void {
    const value = element.dataset.katex || ''
    return new KatexComponent(textbus, {
      text: decodeURIComponent(value)
    })
  }
}
