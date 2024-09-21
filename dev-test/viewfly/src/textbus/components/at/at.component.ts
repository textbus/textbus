import {
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType, fromPromise,
  Keyboard, onBlur, onBreak, onContentDeleted, onContentInserted, onDestroy, onFocus,
  Registry,
  Selection,
  Slot,
  Subject, switchMap,
  Textbus, useContext, useDynamicShortcut,
} from '@textbus/core'
import { createSignal } from '@viewfly/core'

import { SourceCodeComponent } from '../source-code/source-code.component'

export interface Member {
  /** 头像 url */
  avatar: string
  /** 成员名称 */
  name: string
  /** 成员 id */
  id: string
  /** 成员所属群组名 */
  groupName: string
  /** 成员所属群组 id */
  groupId: string
  /** 成员背景色 */
  color?: string
}

export abstract class Organization {
  abstract getMembers(name?: string): Promise<Member[]>

  abstract getMemberById(id: string): Promise<Member | null>
}

export interface AtComponentState {
  userInfo?: Member
  slot?: Slot
}

export function registerAtShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)
  const selection = textbus.get(Selection)
  const commander = textbus.get(Commander)
  keyboard.addShortcut({
    keymap: {
      key: '@',
      shiftKey: true
    },
    action(): boolean | void {
      const { commonAncestorComponent } = selection
      if (commonAncestorComponent instanceof SourceCodeComponent) {
        return false
      }

      const at = new AtComponent(textbus)
      commander.insert(at)
      selection.setPosition(at.state.slot!, 0)
    }
  })
}

export class AtComponent extends Component<AtComponentState> {
  static componentName = 'AtComponent'
  static type = ContentType.InlineComponent

  static fromJSON(textbus: Textbus, { slot: slotState, userInfo }: ComponentStateLiteral<AtComponentState>) {
    const registry = textbus.get(Registry)
    if (slotState) {
      const slot = registry.createSlot(slotState)
      return new AtComponent(textbus, {
        slot
      })
    }
    return new AtComponent(textbus, {
      userInfo,
    })
  }

  focus = new Subject<boolean>()

  members = createSignal<Member[]>([])
  selectedIndex = createSignal(0)

  constructor(textbus: Textbus, state: AtComponentState = {
    slot: new Slot([ContentType.Text])
  }) {
    if (!state.userInfo && !state.slot) {
      state.slot = new Slot([ContentType.Text])
    }
    super(textbus, state)
  }

  override getSlots(): Slot[] {
    if (this.state.slot) {
      return [this.state.slot]
    }
    return []
  }

  override setup() {
    let isFocus = false
    onFocus(() => {
      isFocus = true
      this.focus.next(true)
      onChange.next()
    })
    onBlur(() => {
      isFocus = false
      this.focus.next(false)
      setTimeout(() => {
        if (this.parent && !this.state.userInfo) {
          const slot = this.state.slot
          let text = '@'
          if (slot) {
            text += slot.isEmpty ? '' : slot.toString()
          }
          const snapshot = selection.createSnapshot()
          selection.selectComponent(this)
          commander.insert(text)
          snapshot.restore(true)
        }
      })
    })

    const organization = useContext(Organization)
    const selection = useContext(Selection)
    const commander = useContext(Commander)

    const onChange = new Subject<void>()

    onContentInserted((ev) => {
      const key = this.state.slot!.toString()
      if (key.length > 10) {
        selection.selectComponent(this)
        commander.insert(key)
        ev.preventDefault()
        return
      }
      onChange.next()
    })

    onContentDeleted(() => {
      onChange.next()
    })

    onBreak((ev) => {
      const member = this.members()[this.selectedIndex()]
      if (member) {
        this.state.userInfo = {
          ...member
        }
      }
      selection.selectComponentEnd(this)
      ev.preventDefault()
    })

    useDynamicShortcut({
      keymap: {
        key: ['ArrowDown', 'ArrowUp']
      },
      action: (key: string): boolean | void => {
        let index = this.selectedIndex()
        if (key === 'ArrowUp') {
          if (index > 0) {
            index--
            this.selectedIndex.set(index)
          }
          return
        }
        if (index < this.members().length - 1) {
          index++
          this.selectedIndex.set(index)
        }
      }
    })

    const subs = onChange.pipe(switchMap(() => {
      const key = this.state.slot!.toString()
      return fromPromise(organization.getMembers(key))
    })).subscribe((members) => {
      this.members.set(members)
      this.selectedIndex.set(0)
      if (isFocus) {
        this.focus.next(true)
      }
    })

    onDestroy(() => {
      subs.unsubscribe()
    })
  }
}
