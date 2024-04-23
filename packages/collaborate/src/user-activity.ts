import { Observable, Subject, Subscription } from '@tanbo/stream'
import { Selection, SelectionPaths } from '@textbus/core'
import { WebsocketProvider } from 'y-websocket'
import { Injectable } from '@viewfly/core'

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

  constructor(private websocketProvider: WebsocketProvider,
              private selection: Selection) {
    this.onStateChange = this.stateChangeEvent.asObservable()
    this.onUserChange = this.userChangeEvent.asObservable()
  }

  init(userinfo: UserInfo) {
    const provide = this.websocketProvider
    provide.awareness.setLocalStateField('user', userinfo)
    this.subscription.add(
      this.selection.onChange.subscribe(() => {
        const selection = this.selection.getPaths()
        provide.awareness.setLocalStateField('selection', {
          ...userinfo,
          selection
        })
      })
    )

    provide.awareness.on('update', () => {
      const users: UserInfo[] = []
      const remoteSelections: ActivityInfo[] = []
      provide.awareness.getStates().forEach(state => {
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
  }

  destroy() {
    this.subscription.unsubscribe()
  }
}
