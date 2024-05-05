/* eslint-disable */
import 'reflect-metadata'
import { BrowserModule } from '@textbus/platform-browser'
import {
  Commander,
  Component,
  ContentType, createArrayProxy,
  createVNode,
  FormatHostBindingRender,
  Formatter,
  onBreak,
  onContentInsert, Registry,
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
import { getCurrentInstance } from '@viewfly/core'

interface SingleSlot {
  slot: Slot
}

interface RooComponentState extends SingleSlot {
}

class RootComponent extends Component<RooComponentState> {
  static componentName = 'RootComponent'
  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: any) {
    state.slot = textbus.get(Registry).createSlot(state.slot)
    return new RootComponent(textbus, state)
  }

  constructor(textbus: Textbus, state: RooComponentState) {
    super(textbus, state)
  }

  override setup() {
    const selection = useContext(Selection)
    onContentInsert(ev => {
      if (typeof ev.data.content === 'string' || ev.data.content.type !== ContentType.BlockComponent) {
        const slot = new Slot([
          ContentType.Text
        ])
        const p = new ParagraphComponent(this.textbus, {
          slot
        })
        slot.insert(ev.data.content)
        ev.target.insert(p)
        selection.setPosition(slot, slot.index)
        ev.preventDefault()
      }
    })
  }
}

class ParagraphComponent extends Component<SingleSlot> {
  static componentName = 'ParagraphComponent'

  static type = ContentType.BlockComponent

  static fromJSON(textbus: Textbus, state: any) {
    state.slot = textbus.get(Registry).createSlot(state.slot)
    return new ParagraphComponent(textbus, state)
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
      const p = new ParagraphComponent(context, {
        slot: nextContent
      })
      commander.insertAfter(p, self)
      selection.setPosition(nextContent, 0)
    })
  }
}


async function createEditor() {
  if (!Intl.Segmenter) {
    const polyfill = await import('intl-segmenter-polyfill/dist/bundled');
    (Intl as any).Segmenter = await polyfill.createIntlSegmenterPolyfill()
  }

  const adapter = new Adapter({
    [RootComponent.componentName]: App,
    [ParagraphComponent.componentName]: Paragraph
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


  const textbus = new Textbus({
    components: [
      RootComponent,
      ParagraphComponent
    ],
    imports: [
      browserModule
    ]
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

  const rootModel = new RootComponent(textbus, {
    slot: new Slot([
      ContentType.BlockComponent,
      ContentType.Text
    ]),
  })

  // rootModel.changeMarker.onChange.subscribe(op => {
  //   console.log(op)
  // })

  // const selection = textbus.get(Selection)
  // selection.onChange.subscribe(() => {
  //   console.log(selection.startSlot, selection.startOffset)
  // })

  textbus.render(rootModel)
  // 从这里开始创建编辑器

// textbus.render(rootModel)

  function SlotRender(props: any) {
    const i = getCurrentInstance()
    props.slot.__changeMarker__.onChange.subscribe(() => {
      if (props.slot.__changeMarker__.dirty) {
        i.markAsDirtied()
      }
    })
    return () => {
      console.log('rootSlot---')
      return adapter.slotRender(props.slot, children => {
        return createVNode('div', {
          'textbus-document': 'true',
        }, children)
      })
    }
  }

  function App(props: ViewComponentProps<RootComponent>) {
    const { slot } = props.component.state

    return () => {
      console.log('rootComponent')
      return (
        <div ref={props.rootRef}>
          <SlotRender slot={slot}/>
        </div>
      )
    }
  }

  function Paragraph(props: ViewComponentProps<ParagraphComponent>) {
    const slot = props.component.state.slot
    return () => {
      console.log('paragraphComponent')
      return (
        adapter.slotRender(slot, children => {
          return createVNode('p', { ref: props.rootRef }, children)
        })
      )
    }
  }
}

createEditor()
