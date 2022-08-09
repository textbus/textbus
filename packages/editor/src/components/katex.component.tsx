import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onDestroy, useContext,
  useState,
  VElement
} from '@textbus/core'
import Katex from 'katex'
import { ComponentLoader } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { Form, FormTextarea } from '../uikit/forms/_api'
import { Dialog } from '../dialog'
import { I18n } from '../i18n'

const defaultSource = `% \\f is defined as #1f(#2) using the macro
\\f\\relax{x} = \\int_{-\\infty}^\\infty
    \\f\\hat\\xi\\,e^{2 \\pi i \\xi x}
    \\,d\\xi`

function domToVDom(el: HTMLElement): VElement {
  const attrs: { [key: string]: string } = {}
  el.getAttributeNames().forEach(key => {
    attrs[key] = el.getAttribute(key)!
  })
  return VElement.createElement(el.tagName.toLowerCase(), attrs, Array.from(el.childNodes).map(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      return domToVDom(child as HTMLElement)
    }
    return child.textContent || ''
  }))
}

export interface KatexComponentState {
  source: string
}

export const katexComponent = defineComponent({
  type: ContentType.InlineComponent,
  name: 'KatexComponent',
  setup(initData?: ComponentData<KatexComponentState>) {
    let state = initData?.state || {
      source: defaultSource
    }

    state.source = state.source || defaultSource

    const stateController = useState<KatexComponentState>(state)

    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })
    const injector = useContext()
    const i18n = injector.get(I18n)
    const dialog = injector.get(Dialog)

    const childI18n = i18n.getContext('components.katexComponent.setter')

    function changeSource() {
      const form = new Form({
        title: childI18n.get('title'),
        cancelBtnText: childI18n.get('cancelBtnText'),
        confirmBtnText: childI18n.get('confirmBtnText'),
        items: [
          new FormTextarea({
            name: 'source',
            value: state.source,
            placeholder: childI18n.get('placeholder'),
            label: childI18n.get('label'),
            height: '260px',
            width: '400px'
          })
        ]
      })

      dialog.show(form.elementRef)

      form.onComplete.subscribe(data => {
        stateController.update(draft => {
          draft.source = data.source
        })
        dialog.hide()
      })
      form.onCancel.subscribe(() => dialog.hide())
    }

    onDestroy(() => {
      sub.unsubscribe()
    })

    return {
      render() {
        let htmlString: string
        try {
          htmlString = Katex.renderToString(state.source, {
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
        } catch (e: any) {
          htmlString = `<span style="color: red">${e.stack.split('\n').join('<br>')}</span>`
        }
        const dom = new DOMParser().parseFromString(htmlString, 'text/html').body.children[0] as HTMLElement

        return (
          <tb-katex source={encodeURIComponent(state.source)} onClick={changeSource}>
            {dom ? [domToVDom(dom)] : []}
          </tb-katex>
        )
      }
    }
  }
})

export const katexComponentLoader: ComponentLoader = {
  resources: {
    styles: [
      'tb-katex, .katex-display, .katex, .katex-html{display: inline-block} tb-katex{margin-left: 0.5em; margin-right: 0.5em}'
    ]
  },
  match(element: HTMLElement): boolean {
    return element.tagName.toLowerCase() === 'tb-katex'
  },
  read(element: HTMLElement, context: Injector): ComponentInstance {
    return katexComponent.createInstance(context, {
      state: {
        source: decodeURIComponent(element.getAttribute('source') || '')
      }
    })
  }
}
