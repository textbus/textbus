import { Inject, Injectable, Injector } from '@tanbo/di'
import {
  ComponentInstance,
  Component,
  ContentType,
  Slot,
  SlotLiteral,
  Translator,
  RootComponentRef
} from '@textbus/core'

import { INIT_CONTENT, ROOT_COMPONENT_FACTORY } from '../core/injection-tokens'
import { Parser } from './parser'

@Injectable()
export class ComponentRef extends RootComponentRef {
  component!: ComponentInstance

  constructor(@Inject(ROOT_COMPONENT_FACTORY) private componentFactory: Component,
              @Inject(INIT_CONTENT) private content: string | SlotLiteral,
              private translator: Translator,
              private injector: Injector,
              private parser: Parser) {
    super()
  }

  init() {
    return Promise.resolve().then(() => {
      const slot = new Slot([
        ContentType.BlockComponent
      ])
      this.component = this.componentFactory.createInstance(this.injector, slot)
      if (typeof this.content === 'string') {
        this.parser.parse(this.content || '', slot)
      } else {
        this.translator.fillSlot(this.content, slot)
      }
    })
  }
}
