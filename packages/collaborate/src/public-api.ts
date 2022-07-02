import { History, Module } from '@textbus/core'

import { Collaborate } from './collaborate'
import { CollaborateCursor } from './collaborate-cursor'

export * from './collaborate'
export * from './collaborate-cursor'

export const collaborateModule: Module = {
  providers: [
    Collaborate,
    CollaborateCursor,
    {
      provide: History,
      useClass: Collaborate
    }
  ]
}
