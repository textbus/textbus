import { ViewflyAdapter } from '@textbus/adapter-viewfly'
import { createApp } from '@viewfly/platform-browser'
import { BrowserModule } from '@textbus/platform-browser'
import { Textbus } from '@textbus/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { fontSizeFormatter } from './formatters/font-size'
import { CollaborateModule, SyncConnector, YWebsocketConnector } from '@textbus/collaborate'
import { Doc } from 'yjs'

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
    const collab = new CollaborateModule({
      createConnector(yDoc: Doc): SyncConnector {
        return new YWebsocketConnector('ws://localhost:1234', 'test', yDoc)
      }
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
        browserModule,
        collab
      ]
    })
  }
}
