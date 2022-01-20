import { Draft } from 'immer'

import { VElement } from './element'
import { ContentType, Slot } from './slot'
import { Slots } from './slots'
import { ChangeMarker } from './change-marker'

export interface ComponentLiteral<State = any> {
  name: string
  state: State
}

export interface SlotRenderFactory {
  (): VElement
}

export interface SlotRender {
  (slot: Slot, factory: SlotRenderFactory): VElement
}

export interface ComponentRender {
  (isOutputMode: boolean, slotRender: SlotRender): VElement
}

export interface ComponentMethods<State = any> {
  render: ComponentRender

  toJSON(): State
}

export interface Keymap {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
}

export interface Shortcut {
  keymap: Keymap

  action(key: string): void
}

export interface ComponentInstance<Methods extends ComponentMethods<State> = ComponentMethods, State = any> {
  parent: Slot | null
  changeMarker: ChangeMarker
  name: string
  length: 1
  type: ContentType
  slots: Slots
  methods: Methods
  shortcutList: Shortcut[]

  updateState(fn: (draft: Draft<State>) => void): State

  toJSON(): ComponentLiteral<State>
}
