import 'reflect-metadata'
import { BrowserModule } from '@textbus/platform-browser'
import {
  Commander,
  ComponentInstance,
  ContentType,
  createVNode,
  defineComponent,
  FormatHostBindingRender,
  Formatter,
  onBreak,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf,
  useSlots,
  VElement,
  VTextNode,
} from '@textbus/core'
import { createRoot } from 'react-dom/client'
import { Adapter, ViewComponentProps } from '@textbus/adapter-react'

const adapter = new Adapter({
  RootComponent: App,
  ParagraphComponent: Paragraph
}, (host, root) => {
  const app = createRoot(host)
  app.render(root)
  return () => {
    app.unmount()
  }
})
const browserModule = new BrowserModule(document.getElementById('editor')!, {
  adapter,
  // useContentEditable: true
})

const textbus = new Textbus({
  imports: [
    browserModule
  ]
})

const fontSizeFormatter: Formatter<string> = {
  name: 'fontSize',
  render(children: Array<VElement | VTextNode | ComponentInstance>, formatValue: string): VElement | FormatHostBindingRender {
    return createVNode('span', {
      style: {
        fontSize: formatValue
      }
    }, children)
  }
}

const rootComponent = defineComponent({
  name: 'RootComponent',
  type: ContentType.BlockComponent,
  setup() {
    const slot = new Slot([
      ContentType.Text,
      ContentType.BlockComponent
    ])
    for (let i = 0; i < 50000; i++) {
      const p = paragraphComponent.createInstance(useContext())
      p.slots.first.insert(Math.random().toString(16), fontSizeFormatter, '23px')
      slot.insert(p)
    }
    useSlots([
      slot
    ])
  }
})

const paragraphComponent = defineComponent({
  name: 'ParagraphComponent',
  type: ContentType.BlockComponent,
  setup(initData) {
    const slots = initData?.slots || [new Slot([
      ContentType.Text
    ])]
    useSlots(slots)
    const context = useContext()
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    const self = useSelf()

    onBreak(ev => {
      ev.preventDefault()
      const nextContent = ev.target.cut(ev.data.index)
      const p = paragraphComponent.createInstance(context, {
        slots: [nextContent]
      })
      commander.insertAfter(p, self)
      selection.selectFirstPosition(p)
    })

    return {
      show() {
        return 'dfsafdas'
      }
    }
  }
})

const rootModel = rootComponent.createInstance(textbus)

textbus.render(rootModel)

function App(props: ViewComponentProps<typeof rootComponent>) {
  const slot = props.component.slots.first
  return (
    adapter.slotRender(slot, children => {
      return createVNode('div', {
        'textbus-document': 'true',
        ref: props.rootRef
      }, children)
    })
  )
}

function Paragraph(props: ViewComponentProps<typeof paragraphComponent>) {
  const slot = props.component.slots.first
  return (
    adapter.slotRender(slot, children => {
      return createVNode('p', { ref: props.rootRef }, children)
    })
  )
}

