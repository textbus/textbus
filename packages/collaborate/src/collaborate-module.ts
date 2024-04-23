import { History, Module, Textbus } from '@textbus/core'
import { Provider } from '@viewfly/core'
import { WebsocketProvider } from 'y-websocket'

import { Collaborate } from './collaborate'
import { UserActivity, UserInfo } from './user-activity'

export interface CollaborateConfig {
  url: string
  roomName: string
  userinfo: UserInfo
}

export class CollaborateModule implements Module {
  providers: Provider[] = [
    Collaborate,
    UserActivity,
    {
      provide: History,
      useExisting: Collaborate
    }, {
      provide: WebsocketProvider,
      useFactory: (collab: Collaborate) => {
        return new WebsocketProvider(this.config.url, this.config.roomName, collab.yDoc)
      },
      deps: [Collaborate]
    }
  ]

  constructor(public config: CollaborateConfig) {
  }

  setup(textbus: Textbus): Promise<(() => void) | void> | (() => void) | void {
    const provide = textbus.get(WebsocketProvider)
    const userActivity = textbus.get(UserActivity)
    userActivity.init(this.config.userinfo)
    return new Promise<() => void>((resolve) => {
      provide.on('sync', (is: boolean) => {
        if (is) {
          resolve(() => {
            provide.disconnect()
            userActivity.destroy()
          })
        }
      })
    })
  }
}
