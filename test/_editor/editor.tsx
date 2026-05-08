import { Textbus, TextbusConfig, Module } from '@textbus/core'
import { BrowserModule, DomAdapter } from '@textbus/platform-browser'
import { ViewflyAdapter, ViewflyVDomAdapter } from '@textbus/adapter-viewfly'
import { createApp, HTMLRenderer, OutputTranslator } from '@viewfly/platform-browser'
import { ReflectiveInjector } from '@viewfly/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { InlineComponent, InlineComponentView } from './components/inline.component'
import { ZenBlock, ZenBlockView } from './components/zen-block.component'
import { JsonProbeInline, JsonProbeInlineView } from './components/json-probe-inline.component'
import { JsonProbeBlock, JsonProbeBlockView } from './components/json-probe-block.component'
import { JsonAsyncProbe, JsonAsyncProbeView } from './components/json-async-probe.component'
import { StateProbe, StateProbeView } from './components/state-probe.component'
import { AsyncSlotHolder, AsyncSlotHolderView } from './components/async-slot-holder.component'
import { boldFormatter } from './formatters/bold.formatter'
import { fontSizeFormatter } from './formatters/font-size.formatter'
import { textAlignAttribute } from './attributes/text-align.attribute'

export type TestEditorConfig = TextbusConfig & {
  /**
   * true 时使用 {@link NativeInput}，`BrowserModule.setup` 不再等待 iframe `load`。
   * Jest/jsdom 下单测 iframe 的 load 有时永不触发，会导致 `render()` 卡在 `await Input.onReady`。
   */
  useContentEditable?: boolean
}

export class Editor extends Textbus {
  translator = new OutputTranslator()
  private vDomAdapter: ViewflyVDomAdapter

  constructor(host: HTMLElement, config: TestEditorConfig = {}, modules: Module[] = []) {
    const adapter = new ViewflyAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [InlineComponent.componentName]: InlineComponentView,
      [ZenBlock.componentName]: ZenBlockView,
      [JsonProbeInline.componentName]: JsonProbeInlineView,
      [JsonProbeBlock.componentName]: JsonProbeBlockView,
      [JsonAsyncProbe.componentName]: JsonAsyncProbeView,
      [StateProbe.componentName]: StateProbeView,
      [AsyncSlotHolder.componentName]: AsyncSlotHolderView
    }, (host, root, textbus) => {
      const app = createApp(root, {
        context: textbus
      })

      app.mount(host)
      return () => {
        app.destroy()
      }
    })
    const browserModule = new BrowserModule({
      adapter,
      renderTo(): HTMLElement {
        return host
      },
      useContentEditable: Boolean(config.useContentEditable),
    })

    const vDomAdapter = new ViewflyVDomAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [InlineComponent.componentName]: InlineComponentView,
      [ZenBlock.componentName]: ZenBlockView,
      [JsonProbeInline.componentName]: JsonProbeInlineView,
      [JsonProbeBlock.componentName]: JsonProbeBlockView,
      [JsonAsyncProbe.componentName]: JsonAsyncProbeView,
      [StateProbe.componentName]: StateProbeView,
      [AsyncSlotHolder.componentName]: AsyncSlotHolderView
    } as any, (host, root, injector) => {
      const appInjector = new ReflectiveInjector(injector, [{
        provide: DomAdapter,
        useFactory: () => {
          return vDomAdapter
        }
      }])
      const app = createApp(root, {
        context: appInjector,
        nativeRenderer: new HTMLRenderer()
      }).mount(host)

      return () => {
        app.destroy()
      }
    })

    const { useContentEditable: _uce, ...textbusConfig } = config

    super({
      imports: [
        browserModule,
        ...modules
      ],
      additionalAdapters: [vDomAdapter],
      components: [
        RootComponent,
        ParagraphComponent,
        InlineComponent,
        ZenBlock,
        JsonProbeInline,
        JsonProbeBlock,
        JsonAsyncProbe,
        StateProbe,
        AsyncSlotHolder
      ],
      formatters: [
        boldFormatter,
        fontSizeFormatter,
      ],
      attributes: [
        textAlignAttribute
      ],
      ...textbusConfig
    })

    this.vDomAdapter = vDomAdapter
  }

  getHTML() {
    return this.translator.transform(this.vDomAdapter.host)
  }
}
