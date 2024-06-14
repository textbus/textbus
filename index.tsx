/* eslint-disable */

import { CollaborateModule, SyncConnector, YWebsocketConnector } from '@textbus/collaborate'

HTMLElement.prototype.prepend = HTMLElement.prototype.prepend || function (this: HTMLElement, el: HTMLElement) {
  if (this.childNodes.length === 0) {
    this.appendChild(el)
  } else {
    const firstChild = this.firstChild
    this.insertBefore(el, firstChild)
  }
}

HTMLElement.prototype.append = HTMLElement.prototype.append || function (this: HTMLElement, el: HTMLElement) {
  this.appendChild(el)
}

import 'reflect-metadata'
import 'core-js'
import { BrowserModule, Input, NativeMutationInput } from '@textbus/platform-browser'
import {
  Adapter,
  Commander,
  Component,
  ContentType,
  createVNode,
  FormatHostBindingRender,
  Formatter, Keyboard,
  onBreak,
  onContentInsert,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useSelf,
  VElement,
  VTextNode,
} from '@textbus/core'
import { ViewComponentProps, ViewflyAdapter, ViewflyVDomAdapter } from '@textbus/adapter-viewfly'
import { createApp, HTMLRenderer, OutputTranslator } from '@viewfly/platform-browser'
import { createRef, getCurrentInstance, inject } from '@viewfly/core'
import { fromEvent, merge } from '@tanbo/stream'

import './index.scss'
import { Doc } from 'yjs'

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

  override getSlots(): Slot[] {
    return [this.state.slot]
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

  override getSlots(): Slot[] {
    return [this.state.slot]
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

const adapter = new ViewflyAdapter({
  [RootComponent.componentName]: App,
  [ParagraphComponent.componentName]: Paragraph
}, (host, root, context) => {
  const app = createApp(root, {
    context
  })
  app.mount(host)
  return () => {
    app.destroy()
  }
})
const browserModule = new BrowserModule({
  adapter: adapter,
  renderTo() {
    return document.getElementById('editor')!
  },
  useContentEditable: true
})

const htmlRenderer = new ViewflyVDomAdapter({
  [RootComponent.componentName]: App as any,
  [ParagraphComponent.componentName]: Paragraph
}, (host, root, context) => {
  const app = createApp(root, {
    context,
    nativeRenderer: new HTMLRenderer()
  })
  app.mount(host)
  return () => {
    app.destroy()
  }
})

// const collabModule = new CollaborateModule({
//   userinfo: {
//     username: Math.random().toString(),
//     color: '#ff0000',
//     id: Math.random().toString()
//   },
//   createConnector(yDoc: Doc): SyncConnector {
//     return new YWebsocketConnector('ws://localhost:1234', 'test', yDoc)
//   }
// })

const textbus = new Textbus({
  additionalAdapters: [htmlRenderer],
  components: [
    RootComponent,
    ParagraphComponent
  ],
  imports: [
    browserModule,
    // collabModule
  ],
  providers: [{
    provide: Input,
    useClass: NativeMutationInput
  }]
  // plugins: [{
  //   setup(textbus) {
  //     const adapter = textbus.get(DomAdapter)
  //     const a = adapter.getNativeNodeBySlot(rootModel.state.slot)
  //     console.log(a)
  //   },
  // }]
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
    ContentType.BlockComponent
  ]),
})
const p = new ParagraphComponent(textbus, {
  slot: new Slot([
    ContentType.InlineComponent,
    ContentType.Text
  ])
})
p.state.slot.insert('abcdefg')
rootModel.state.slot.insert(p)

const t = new OutputTranslator()

htmlRenderer.onViewUpdated.subscribe(() => {
  // console.log(rootModel)
  // console.log(t.transform(htmlRenderer.host))
})
rootModel.changeMarker.onChange.subscribe(op => {
  // console.log(JSON.stringify(op.apply))
})

// const selection = textbus.get(Selection)
// selection.onChange.subscribe(() => {
//   console.log(selection.startSlot, selection.startOffset)
// })

textbus.render(rootModel)
// 从这里开始创建编辑器

textbus.get(Keyboard).addShortcut({
  keymap: {
    key: 'b',
    ctrlKey: true,
  },
  action(key: string): boolean | void {
    console.log(key)
  }
})

// textbus.onChange.subscribe(() => {
//   console.log(textbus.getJSON())
// })

// textbus.render(rootModel)

function SlotRender(props: {slot: Slot}) {
  const i = getCurrentInstance()
  const slot = props.slot
  merge(slot.__changeMarker__.onChange, slot.__changeMarker__.onForceChange).subscribe(() => {
    if (props.slot.__changeMarker__.dirty) {
      i.markAsDirtied()
    }
  })
  const adapter = inject(Adapter)
  // console.log(adapter, '=====')
  return () => {
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
    // console.log('rootComponent')
    return (
      <div ref={props.rootRef}>
        <SlotRender slot={slot}/>
      </div>
    )
  }
}

function Paragraph(props: ViewComponentProps<ParagraphComponent>) {
  const slot = props.component.state.slot
  const adapter = inject(Adapter)
  return () => {
    // console.log('paragraphComponent')
    return (
      adapter.slotRender(slot, children => {
        return createVNode('p', { ref: props.rootRef, class: 'test' }, children)
      })
    )
  }
}

const editor = textbus

function Tools() {
  const textareaRef = createRef<HTMLTextAreaElement>()
  return () => {
    return (
      <div style={{
        width: '400px'
      }}>
        <div className="btn-list">
          <div>
            <button type="button" onClick={() => {
              const paths = editor.get(Selection).getPaths()
              textareaRef.current!.value = JSON.stringify(paths)
            }}>获取选区路径
            </button>
            <button type="button" onClick={() => {
              const json = editor.getJSON()
              textareaRef.current!.value = JSON.stringify(json)
            }}>获取 JSON 内容
            </button>
            <button type="button" onClick={() => {

            }}>获取 HTML 内容
            </button>
          </div>
          <div>
            <button type="button" onClick={() => {
              textareaRef.current!.select()
              document.execCommand('copy')
            }}>复制内容
            </button>
          </div>
        </div>
        <div className="content">
          <textarea ref={textareaRef}></textarea>
        </div>
        <div className="btn-list">
          <div>
            <button type="button">替换为框内 JSON</button>
            <button type="button">替换为框内 HTML</button>
            <button type="button">应用框内 JSON 路径</button>
            <button type="button">销毁 textbus</button>
          </div>
        </div>
      </div>
    )
  }
}

const toolApp = createApp(<Tools/>).mount(document.querySelector('.right')!)
