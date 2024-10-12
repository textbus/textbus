import {
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  onBreak,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useDynamicShortcut,
  ZenCodingGrammarInterceptor
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { ViewComponentProps } from '@textbus/adapter-viewfly'

import './todolist.component.scss'
import { ParagraphComponent } from '../paragraph/paragraph.component'
import { textIndentAttr } from '../../attributes/text-indent.attr'
import { strikeThroughFormatter } from '../../formatters/strike-through'
import { textAlignAttr } from '../../attributes/text-align.attr'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'
import { headingAttr } from '../../attributes/heading.attr'
import { SlotRender } from '../SlotRender'

export interface TodolistComponentState {
  checked: boolean
  slot: Slot
}

export class TodolistComponent extends Component<TodolistComponentState> {
  static type = ContentType.BlockComponent
  static componentName = 'TodoListComponent'
  static zenCoding: ZenCodingGrammarInterceptor<TodolistComponentState> = {
    match(content, textbus) {
      const selection = textbus.get(Selection)
      if (selection.commonAncestorComponent instanceof ParagraphComponent) {
        return /^\[(x|\s)?\]$/.test(content)
      }
      return false
    },
    key: ' ',
    createState(content: string, textbus): TodolistComponentState {
      const selection = textbus.get(Selection)
      const commonAncestorSlot = selection.commonAncestorSlot!

      const slot = new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ])
      if (commonAncestorSlot?.hasAttribute(textIndentAttr)) {
        slot.setAttribute(textIndentAttr, commonAncestorSlot.getAttribute(textIndentAttr))
      }
      const isChecked = content.charAt(1) === 'x'
      return {
        checked: isChecked,
        slot
      }
    }
  }

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<TodolistComponentState>) {
    const slot = textbus.get(Registry).createSlot(json.slot)
    return new TodolistComponent(textbus, {
      slot,
      checked: json.checked
    })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const textbus = useContext()
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    onBreak(ev => {
      const slot = ev.target.cut(ev.data.index)
      slot.removeAttribute(headingAttr)
      if (ev.target.isEmpty && slot.isEmpty) {
        const beforeIndex = this.parent!.indexOf(this)
        const beforeComponent = this.parent!.getContentAtIndex(beforeIndex - 1)
        if (beforeComponent instanceof TodolistComponent) {
          const nextComponent = new ParagraphComponent(textbus, {
            slot: new Slot([
              ContentType.Text,
              ContentType.InlineComponent
            ])
          })
          nextComponent.state.slot.insertDelta(slot.toDelta())
          commander.insertAfter(nextComponent, this)
          commander.removeComponent(this)
          selection.setPosition(nextComponent.state.slot, 0)
          ev.preventDefault()
          return
        }
      }
      const nextParagraph = new TodolistComponent(textbus, {
        checked: this.state.checked,
        slot
      })
      commander.insertAfter(nextParagraph, this)
      selection.setPosition(slot, 0)
      ev.preventDefault()
    })

    useDynamicShortcut({
      keymap: {
        key: 'Backspace'
      },
      action: (): boolean | void => {
        if (!selection.isCollapsed || selection.startOffset !== 0) {
          return false
        }
        const slot = selection.commonAncestorSlot!.cut()
        const paragraph = new ParagraphComponent(textbus, {
          slot
        })
        commander.replaceComponent(this, paragraph)
        selection.setPosition(slot, 0)
      }
    })
  }
}

export function TodolistView(props: ViewComponentProps<TodolistComponent>) {
  const component = props.component
  const state = component.state

  function toggle() {
    if (readonly() || output()) {
      return
    }
    state.checked = !state.checked
    state.slot.applyFormat(strikeThroughFormatter, {
      startIndex: 0,
      endIndex: state.slot.length,
      value: state.checked ? true : null
    })
  }

  const align = {
    left: 'left',
    right: 'right',
    center: 'center',
    justify: 'left'
  }
  const readonly = useReadonly()
  const output = useOutput()
  return () => {
    const { slot, checked } = state
    const indent = slot.getAttribute(textIndentAttr) || 0
    return (
      <div data-component={TodolistComponent.componentName} ref={props.rootRef} class="xnote-todolist" style={{
        marginLeft: indent * 24 + 'px',
        justifyContent: align[component.state.slot.getAttribute(textAlignAttr)!],
        textAlign: component.state.slot.getAttribute(textAlignAttr) === 'justify' ? 'justify' : void 0
      }}>
        <div class="xnote-todolist-icon" onClick={toggle}>
          <span data-checked={checked} class={[checked ? 'xnote-icon-checkbox-checked' : 'xnote-icon-checkbox-unchecked']}/>
        </div>

        <SlotRender slot={slot} tag="div" class="xnote-todolist-content" renderEnv={readonly() || output()}/>
      </div>
    )
  }
}

export const todolistComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === TodolistComponent.componentName
  },
  read(element: HTMLElement, injector: Textbus, slotParser: SlotParser): Component | Slot {
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ]), element.children[1] as HTMLElement)
    return new TodolistComponent(injector, {
      checked: element.children[0]!.hasAttribute('checked'),
      slot
    })
  }
}
