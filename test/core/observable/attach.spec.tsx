import { Component, ContentType, createVNode, onDetach, Slot, Textbus } from '@textbus/core'
import { ViewComponentProps, ViewflyAdapter } from '@textbus/adapter-viewfly'
import { createApp } from '@viewfly/platform-browser'
import { BrowserModule, DomAdapter } from '@textbus/platform-browser'
import { inject } from '@viewfly/core'

describe('Attach', () => {
  let editor: Textbus | null

  afterEach(() => {
    editor?.destroy()
  })
  test('初始渲染可以正确调用 setup 方法', async () => {
    const fn = jest.fn()

    class RootComponent extends Component {
      static componentName = 'RootComponent'
      static type = ContentType.BlockComponent

      override setup() {
        fn()
      }
    }

    function RootComponentView(props: ViewComponentProps<RootComponent>) {
      return () => {
        return (
          <div ref={props.rootRef}></div>
        )
      }
    }

    const browserModule = new BrowserModule({
      renderTo(): HTMLElement {
        return document.body
      },
      adapter: new ViewflyAdapter({
        [RootComponent.componentName]: RootComponentView
      }, (host, viewComponent, injector) => {
        const app = createApp(viewComponent, {
          context: injector
        })

        app.mount(host)
        return () => {
          app.destroy()
        }
      })
    })
    editor = new Textbus({
      imports: [
        browserModule
      ]
    })
    const root = new RootComponent({})

    await editor.render(root)

    expect(fn).toBeCalledTimes(1)
  })
  test('异步添加的组件可以正确调用 setup 方法', async () => {
    const fn = jest.fn()

    class RootComponent extends Component<{slot: Slot}> {
      static componentName = 'RootComponent'
      static type = ContentType.BlockComponent

      override setup() {
        fn()
      }
    }

    const fn2 = jest.fn()
    const fn3 = jest.fn()

    class BlockComponent extends Component<{slot: Slot}> {
      static componentName = 'BlockComponent'
      static type = ContentType.BlockComponent

      override setup() {
        fn2()
        onDetach(fn3)
      }
    }

    function RootComponentView(props: ViewComponentProps<RootComponent>) {
      const domAdapter = inject(DomAdapter)
      return () => {
        return (
          <div ref={props.rootRef}>
            {
              domAdapter.slotRender(props.component.state.slot, children => {
                return createVNode('div', null, children)
              })
            }
          </div>
        )
      }
    }

    const browserModule = new BrowserModule({
      renderTo(): HTMLElement {
        return document.body
      },
      adapter: new ViewflyAdapter({
        [RootComponent.componentName]: RootComponentView,
        [BlockComponent.componentName]: RootComponentView
      }, (host, viewComponent, injector) => {
        const app = createApp(viewComponent, {
          context: injector
        })

        app.mount(host)
        return () => {
          app.destroy()
        }
      })
    })
    editor = new Textbus({
      imports: [
        browserModule
      ]
    })
    const root = new RootComponent({
      slot: new Slot([
        ContentType.BlockComponent
      ])
    })

    await editor.render(root)

    root.state.slot.insert(new BlockComponent({
      slot: new Slot([
        ContentType.Text
      ])
    }))

    expect(fn2).toBeCalledTimes(1)

    const newSlot = new Slot([
      ContentType.BlockComponent
    ])
    const newBlock = new BlockComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })

    newSlot.insert(newBlock)

    expect(fn2).toBeCalledTimes(1)
    expect(fn3).toBeCalledTimes(0)


    root.state.slot = newSlot

    expect(fn3).toBeCalledTimes(1)
    expect(fn2).toBeCalledTimes(2)
  })
})
