import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { createApp } from '@viewfly/platform-browser'
import { BrowserModule } from '@textbus/platform-browser'
import { Textbus } from '@textbus/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { fontSizeFormatter } from './formatters/font-size'

export class TestEditor extends Textbus {
  constructor(getHost: () => HTMLElement) {
    const adapter = new ViewflyAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView
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
        return getHost()
      },
      // useContentEditable: true
    })
    super({
      components: [
        RootComponent,
        ParagraphComponent
      ],
      formatters: [
        fontSizeFormatter
      ],
      imports: [
        browserModule
      ]
    })
  }
}
