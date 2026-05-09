import type { Component, ComponentConstructor, ComponentLiteral, ComponentStateLiteral } from './component'
import type { SlotLiteral } from './slot'
import type { Textbus } from '../textbus'

export interface Metadata {
  [key: string]: any
}

export interface AsyncComponentLiteral<State = any> extends ComponentLiteral<State> {
  async: true
  metadata: any
}

export interface AsyncSlotLiteral<
  T extends Record<string, any> = Record<string, any>,
  U = any> extends SlotLiteral<T> {
  async: true
  metadata: U
}

export interface AsyncComponentConstructor<
  M extends Metadata = Metadata,
  T extends Record<string, any> = Record<string, any>> extends ComponentConstructor<T> {
  fromJSONAndMetadata?(textbus: Textbus, data: ComponentStateLiteral<T>, metadata: M): Component<T>
}
