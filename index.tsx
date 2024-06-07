/* eslint-disable */
import 'reflect-metadata'
import { BrowserModule, DomAdapter } from '@textbus/platform-browser'
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
  VElement, Adapter,
  VTextNode,
} from '@textbus/core'
import { ViewflyAdapter, ViewflyVDomAdapter, ViewComponentProps } from '@textbus/adapter-viewfly'
import { createApp, HTMLRenderer, OutputTranslator } from '@viewfly/platform-browser'
import { getCurrentInstance, inject } from '@viewfly/core'
import { fromEvent, merge } from '@tanbo/stream'

import './index.scss'

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
    // useContentEditable: true
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

  const textbus = new Textbus({
    additionalAdapters: [htmlRenderer],
    components: [
      RootComponent,
      ParagraphComponent
    ],
    imports: [
      browserModule
    ],
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

  const t = new OutputTranslator()

  htmlRenderer.onViewUpdated.subscribe(() => {
    // console.log(rootModel)
    // console.log(t.transform(htmlRenderer.host))
  })
  // rootModel.changeMarker.onChange.subscribe(op => {
  //   console.log(op)
  // })

  // const selection = textbus.get(Selection)
  // selection.onChange.subscribe(() => {
  //   console.log(selection.startSlot, selection.startOffset)
  // })

  await textbus.render(rootModel)
  // 从这里开始创建编辑器

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
          return createVNode('p', { ref: props.rootRef }, children)
        })
      )
    }
  }

  return textbus
}

const header = document.getElementById('avatar')!
const btns = document.querySelectorAll('button')
const textarea = document.getElementById('textarea')! as HTMLTextAreaElement
createEditor().then(editor => {
  fromEvent(btns[0], 'click').subscribe(() => {
    const paths = editor.get(Selection).getPaths()
    textarea.value = JSON.stringify(paths)
  })
  fromEvent(btns[1], 'click').subscribe(() => {
    const json = editor.getJSON()
    textarea.value = JSON.stringify(json)
  })
  fromEvent(btns[2], 'click').subscribe(() => {
    // const contents = editor.getHTML()
    // textarea.value = contents
  })
  fromEvent(btns[3], 'click').subscribe(() => {
    textarea.select()
    document.execCommand('copy')
  })
  fromEvent(btns[4], 'click').subscribe(() => {
    // const json = parser.parse(textarea.value)
    // editor.replaceContent(json)
  })
  fromEvent(btns[5], 'click').subscribe(() => {
    // const html = textarea.value
    // editor.replaceContent(html)
  })
  fromEvent(btns[6], 'click').subscribe(() => {
    // const paths = parser.parse(textarea.value)
    // const selection = editor.get(Selection)
    // selection.usePaths(paths)
    // selection.restore()
  })
  fromEvent(btns[7], 'click').subscribe(() => {
    editor.destroy()
  })
})
