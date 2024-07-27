import { Plugin } from '@textbus/core'
import { VIEW_DOCUMENT } from '@textbus/platform-browser'
import { Application, Injector } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

import { Toolbar } from './toolbar'
import { useReadonly } from '../../textbus/hooks/use-readonly'

export class ToolbarPlugin implements Plugin {
  private app: Application | null = null

  setup(injector: Injector) {
    const App = function () {
      const readonly = useReadonly()
      return () => {
        return readonly() ? null : <Toolbar/>
      }
    }
    this.app = createApp(<App/>, {
      context: injector
    })
    const viewDocument = injector.get(VIEW_DOCUMENT)
    const host = document.createElement('div')
    viewDocument.appendChild(host)
    this.app.mount(host)
  }

  onDestroy() {
    this.app?.destroy()
  }
}
