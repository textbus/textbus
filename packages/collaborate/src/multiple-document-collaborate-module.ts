import { History, Module, Textbus } from '@textbus/core'
import { Provider } from '@viewfly/core'

import { Collaborate } from './collaborate'
import { UserActivity } from './user-activity'
import { SyncConnector } from './sync-connector'
import { CollaborateConfig } from './collaborate-module'
import { MultipleDocCollabHistory } from './multiple-doc-collab-history'
import { SubModelLoader } from './sub-model-loader'

export interface MultipleDocCollaborateConfig extends CollaborateConfig {
  subModelLoader: SubModelLoader
}

export class MultipleDocumentCollaborateModule implements Module {
  providers: Provider[] = [
    Collaborate,
    UserActivity,
    MultipleDocCollabHistory,
    {
      provide: History,
      useExisting: MultipleDocCollabHistory
    }, {
      provide: SyncConnector,
      useFactory: (collab: Collaborate) => {
        return this.config.createConnector(collab.yDoc)
      },
      deps: [Collaborate]
    }, {
      provide: SubModelLoader,
      useFactory: () => {
        return this.config.subModelLoader
      }
    }
  ]

  constructor(public config: MultipleDocCollaborateConfig) {
  }

  setup(textbus: Textbus): Promise<(() => void) | void> | (() => void) | void {
    const connector = textbus.get(SyncConnector)
    const userActivity = textbus.get(UserActivity)
    userActivity.init(this.config.userinfo)
    return connector.onLoad.toPromise()
  }

  onDestroy(textbus: Textbus) {
    textbus.get(Collaborate).destroy()
    textbus.get(History).destroy()
    textbus.get(UserActivity).destroy()
    textbus.get(SyncConnector).onDestroy()
  }
}
