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
import { createApp, defineComponent as defineVue } from 'vue'
import { Adapter, ViewComponentProps } from '@textbus/adapter-vue'

const App = defineVue({
  props: ['component', 'rootRef'],
  setup(props: ViewComponentProps) {
    return () => {
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
  }
})

const Paragraph = defineVue({
  props: ['component', 'rootRef'],
  setup(props: ViewComponentProps) {
    return () => {
      const slot = props.component.slots.first
      return (
        adapter.slotRender(slot, children => {
          return createVNode('p', { ref: props.rootRef }, children)
        })
      )
    }
  }
})

const adapter = new Adapter({
  RootComponent: App,
  ParagraphComponent: Paragraph
}, (host, root) => {
  const app = createApp(root)
  app.mount(host)
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
    for (let i = 0; i < 500; i++) {
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

