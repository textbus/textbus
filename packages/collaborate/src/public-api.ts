import { History, Module } from '@textbus/core'

import { Collaborate } from './collaborate'

export * from './collaborate'

export const collaborateModule: Module = {
  providers: [
    Collaborate,
    {
      provide: History,
      useExisting: Collaborate
    }
  ]
}
