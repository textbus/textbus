import 'reflect-metadata'
import { BrowserModule } from '@textbus/platform-browser'
import {
  Commander,
  Component,
  ContentType,
  createVNode,
  FormatHostBindingRender,
  Formatter,
  onBreak,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf,
  VElement,
  VTextNode,
} from '@textbus/core'
import { Adapter, ViewComponentProps } from '@textbus/adapter-viewfly'
import { createApp } from '@viewfly/platform-browser'

interface SingleSlot {
  slot: Slot
}

async function createEditor() {
  if (!Intl.Segmenter) {
    const polyfill = await import('intl-segmenter-polyfill/dist/bundled');
    (Intl as any).Segmenter = await polyfill.createIntlSegmenterPolyfill()
  }
  const adapter = new Adapter({
    RootComponent: App as any,
    ParagraphComponent: Paragraph as any
  }, (host, root) => {
    const app = createApp(root)
    app.mount(host)
    return () => {
      app.destroy()
    }
  })
  const browserModule = new BrowserModule({
    adapter,
    renderTo() {
      return document.getElementById('editor')!
    },
    // useContentEditable: true
  })

  class RootComponent extends Component<SingleSlot> {
    static componentName = 'RootComponent'
    static type = ContentType.BlockComponent

    static createInstance(textbus: Textbus, state: SingleSlot) {
      return new RootComponent(textbus, state)
    }

    constructor(textbus: Textbus, state: SingleSlot) {
      super(textbus, state)
    }
  }

  class ParagraphComponent extends Component<SingleSlot> {
    static componentName = 'ParagraphComponent'

    static type = ContentType.BlockComponent

    static createInstance(textbus: Textbus, state: SingleSlot) {
      return new RootComponent(textbus, state)
    }

    constructor(textbus: Textbus, state: SingleSlot) {
      super(textbus, state)
    }

    override setup() {
      const context = useContext()
      const commander = useContext(Commander)
      const selection = useContext(Selection)
      const self = useSelf()

      onBreak(ev => {
        ev.preventDefault()
        const nextContent = ev.target.cut(ev.data.index)
        const p = ParagraphComponent.createInstance(context, {
          slot: nextContent
        })
        commander.insertAfter(p, self)
        selection.selectFirstPosition(p)
      })
    }
  }

  const textbus = new Textbus({
    components: [
      RootComponent,
      ParagraphComponent
    ],
    imports: [
      browserModule
    ]
  })

  textbus.onChange.subscribe(() => {
    console.log(rootModel.toJSON())
  })

  const fontSizeFormatter = new Formatter<string>('fontSize', {
    columned: false,
    inheritable: true,
    priority: 0,
    render(children: Array<VElement | VTextNode | Component>, formatValue: string): VElement | FormatHostBindingRender {
      return createVNode('span', {
        style: {
          fontSize: formatValue
        }
      }, children)
    }
  })

  const rootModel = RootComponent.createInstance(textbus, {
    slot: new Slot([
      ContentType.BlockComponent,
      ContentType.Text
    ])
  })


  textbus.render(rootModel)
  // 从这里开始创建编辑器

// textbus.render(rootModel)

  function App(props: ViewComponentProps<RootComponent>) {
    const slot = props.component.slots.first

    return () => {
      return (
        <div class="xxxx">
          {
            adapter.slotRender(slot, children => {
              return createVNode('div', {
                'textbus-document': 'true',
                ref: props.rootRef
              }, children)
            })
          }
        </div>
      )
    }
  }

  function Paragraph(props: ViewComponentProps<ParagraphComponent>) {
    const slot = props.component.slots.first
    return () => {
      return (
        adapter.slotRender(slot, children => {
          return createVNode('p', { ref: props.rootRef }, children)
        })
      )
    }
  }
}

createEditor()
