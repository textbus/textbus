import { Textbus, TextbusConfig, Module } from '@textbus/core'
import { BrowserModule, DomAdapter } from '@textbus/platform-browser'
import { ViewflyAdapter, ViewflyVDomAdapter } from '@textbus/adapter-viewfly'
import { createApp, HTMLRenderer, OutputTranslator } from '@viewfly/platform-browser'
import { ReflectiveInjector } from '@viewfly/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { InlineComponent, InlineComponentView } from './components/inline.component'
import { boldFormatter } from './formatters/bold.formatter'
import { fontSizeFormatter } from './formatters/font-size.formatter'
import { textAlignAttribute } from './attributes/text-align.attribute'

export class Editor extends Textbus {
  translator = new OutputTranslator()
  private vDomAdapter: ViewflyVDomAdapter

  constructor(host: HTMLElement, config: TextbusConfig = {}, modules: Module[] = []) {
    const adapter = new ViewflyAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [InlineComponent.componentName]: InlineComponentView,
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
      }
    })

    const vDomAdapter = new ViewflyVDomAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [InlineComponent.componentName]: InlineComponentView,
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

    super({
      imports: [
        browserModule,
        ...modules
      ],
      additionalAdapters: [vDomAdapter],
      components: [
        RootComponent,
        ParagraphComponent,
        InlineComponent
      ],
      formatters: [
        boldFormatter,
        fontSizeFormatter,
      ],
      attributes: [
        textAlignAttribute
      ],
      ...config
    })

    this.vDomAdapter = vDomAdapter
  }

  getHTML() {
    return this.translator.transform(this.vDomAdapter.host)
  }
}
