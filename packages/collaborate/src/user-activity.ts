import { Observable, Subject, Subscription } from '@tanbo/stream'
import { Selection, SelectionPaths } from '@textbus/core'
import { Injectable } from '@viewfly/core'

import { SyncConnector } from './sync-connector'

export interface UserInfo {
  username: string
  color: string
  id: string
}

export interface ActivityInfo extends UserInfo {
  selection: SelectionPaths
}

@Injectable()
export class UserActivity {
  onStateChange: Observable<ActivityInfo[]>
  onUserChange: Observable<UserInfo[]>

  private stateChangeEvent = new Subject<ActivityInfo[]>()
  private userChangeEvent = new Subject<UserInfo[]>()

  private subscription = new Subscription()

  constructor(private syncConnector: SyncConnector,
              private selection: Selection) {
    this.onStateChange = this.stateChangeEvent.asObservable()
    this.onUserChange = this.userChangeEvent.asObservable()
  }

  init(userinfo: UserInfo) {
    this.syncConnector.setLocalStateField('user', userinfo)
    this.subscription.add(
      this.selection.onChange.subscribe(() => {
        const selection = this.selection.getPaths()
        this.syncConnector.setLocalStateField('selection', {
          ...userinfo,
          selection
        })
      }),
      this.syncConnector.onStateChange.subscribe((states) => {
        const users: UserInfo[] = []
        const remoteSelections: ActivityInfo[] = []
        states.forEach(item => {
          const state = item.state
          if (state.user) {
            users.push(state.user)
          }
          if (state.selection) {
            remoteSelections.push(state.selection)
          }
        })
        const selections = remoteSelections.filter(i => i.id !== userinfo.id)
        this.userChangeEvent.next(users)
        this.stateChangeEvent.next(selections)
      })
    )
  }

  destroy() {
    this.subscription.unsubscribe()
  }
}
