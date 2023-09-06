import { History, Module } from '@textbus/core'
import { Provider } from '@viewfly/core'

import { Collaborate } from './collaborate'

export class CollaborateModule implements Module {
  providers: Provider[] = [
    Collaborate,
    {
      provide: History,
      useExisting: Collaborate
    }
  ]
}
