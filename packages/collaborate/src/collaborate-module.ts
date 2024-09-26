import { History, Module, Textbus } from '@textbus/core'
import { Provider } from '@viewfly/core'
import { Doc as YDoc } from 'yjs'

import { Collaborate } from './collaborate'
import { UserActivity, UserInfo } from './user-activity'
import { SyncConnector } from './sync-connector'

export interface CollaborateConfig {
  userinfo: UserInfo
  createConnector(yDoc: YDoc): SyncConnector
}

export class CollaborateModule implements Module {
  providers: Provider[] = [
    Collaborate,
    UserActivity,
    {
      provide: History,
      useExisting: Collaborate
    }, {
      provide: SyncConnector,
      useFactory: (collab: Collaborate) => {
        return this.config.createConnector(collab.yDoc)
      },
      deps: [Collaborate]
    }
  ]

  constructor(public config: CollaborateConfig) {
  }

  setup(textbus: Textbus): Promise<(() => void) | void> | (() => void) | void {
    const connector = textbus.get(SyncConnector)
    const userActivity = textbus.get(UserActivity)
    userActivity.init(this.config.userinfo)
    return connector.onLoad.toPromise()
  }

  onDestroy(textbus: Textbus) {
    textbus.get(UserActivity).destroy()
    textbus.get(SyncConnector).onDestroy()
  }
}
