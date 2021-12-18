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

export interface SegmentedSlots<T extends Slot = Slot> {
  before: T[]
  middle: T[]
  after: T[]
}

export interface ComponentMethods<State = any> {
  render: ComponentRender

  toJSON(): State

  split?(startIndex: number, endIndex: number): SegmentedSlots
}

export interface ComponentInstance<Methods extends ComponentMethods<State> = ComponentMethods, State = any> {
  parent: Slot | null
  changeMarker: ChangeMarker
  name: string
  length: 1
  type: ContentType
  slots: Slots
  methods: Methods

  useState(state: State): void

  toJSON(): ComponentLiteral<State>
}
