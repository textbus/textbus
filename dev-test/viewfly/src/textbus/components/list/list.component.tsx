import {
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  Keyboard,
  onBreak,
  onParentSlotUpdated,
  Registry,
  Selection,
  Slot,
  Textbus,
  useContext,
  useDynamicShortcut,
  ZenCodingGrammarInterceptor,
} from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'

import './list.component.scss'
import { textIndentAttr } from '../../attributes/text-indent.attr'
import { ParagraphComponent } from '../paragraph/paragraph.component'
import { Dropdown } from '../../../components/dropdown/dropdown'
import { Button } from '../../../components/button/button'
import { MenuItem } from '../../../components/menu-item/menu-item'
import { textAlignAttr } from '../../attributes/text-align.attr'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'
import { headingAttr } from '../../attributes/heading.attr'
import { SlotRender } from '../SlotRender'

export interface ListComponentState {
  type: 'OrderedList' | 'UnorderedList'
  slot: Slot
  reorder: boolean
}

export function toList(textbus: Textbus, type: 'OrderedList' | 'UnorderedList') {
  const commander = textbus.get(Commander)
  commander.transform({
    targetType: ListComponent.type,
    slotFactory() {
      return new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ])
    },
    stateFactory(slots: Slot[]) {
      return slots.map((slot, index) => {
        return new ListComponent(textbus, {
          type,
          reorder: index === 0,
          slot
        })
      })
    }
  })
}

export function registerListShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)
  keyboard.addShortcut({
    keymap: {
      key: ['o', 'u'],
      modKey: true,
      shiftKey: true
    },
    action(key: string): boolean | void {
      toList(textbus, key === 'o' ? 'OrderedList' : 'UnorderedList')
    }
  })
}

export class ListComponent extends Component<ListComponentState> {
  static componentName = 'ListComponent'
  static type = ContentType.BlockComponent

  static zenCoding: ZenCodingGrammarInterceptor<ListComponentState> = {
    key: ' ',
    match(content, textbus) {
      const selection = textbus.get(Selection)
      if (selection.commonAncestorComponent instanceof ParagraphComponent) {
        return /^([1-9]\.|[+*-])$/.test(content)
      }
      return false
    },
    createState(content: string, textbus: Textbus) {
      const selection = textbus.get(Selection)
      const commonAncestorSlot = selection.commonAncestorSlot!

      const slot = new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ])
      if (commonAncestorSlot?.hasAttribute(textIndentAttr)) {
        slot.setAttribute(textIndentAttr, commonAncestorSlot.getAttribute(textIndentAttr))
      }
      return {
        type: /[-+*]/.test(content) ? 'UnorderedList' : 'OrderedList',
        reorder: true,
        slot
      }
    }
  }

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<ListComponentState>) {
    return new ListComponent(textbus, {
      type: json.type,
      reorder: json.reorder,
      slot: textbus.get(Registry).createSlot(json.slot)
    })
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    const textbus = useContext()
    const commander = useContext(Commander)
    const selection = useContext(Selection)
    const updateAfterList = (ref: Component<any>) => {
      if (this.state.type === 'UnorderedList') {
        return
      }
      const parentSlot = ref.parent!
      const index = parentSlot.indexOf(ref)
      const afterContent = parentSlot.sliceContent(index + 1)

      for (const item of afterContent) {
        if (item instanceof ListComponent &&
          item.state.type === 'OrderedList') {
          if (item.state.reorder) {
            break
          }
          item.changeMarker.forceMarkDirtied()
        }
      }
    }

    onParentSlotUpdated(() => {
      this.changeMarker.forceMarkDirtied()
    })
    onBreak(ev => {
      const slot = ev.target.cut(ev.data.index)
      slot.removeAttribute(headingAttr)
      if (ev.target.isEmpty && slot.isEmpty) {
        const beforeIndex = this.parent!.indexOf(this)
        const beforeComponent = this.parent!.getContentAtIndex(beforeIndex - 1)
        if (beforeComponent instanceof ListComponent) {
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
          updateAfterList(nextComponent)
          ev.preventDefault()
          return
        }
      }
      const nextList = new ListComponent(textbus, {
        slot,
        reorder: false,
        type: this.state.type
      })
      commander.insertAfter(nextList, this)
      selection.setPosition(slot, 0)
      updateAfterList(nextList)
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

    useDynamicShortcut({
      keymap: {
        key: 'Tab'
      },
      action: (): boolean | void => {
        Promise.resolve().then(() => updateAfterList(this))
        return false
      }
    })

    useDynamicShortcut({
      keymap: {
        key: 'Tab',
        shiftKey: true
      },
      action: (): boolean | void => {
        Promise.resolve().then(() => updateAfterList(this))
        return false
      }
    })
  }
}

const step = 26
const chars = Array.from({ length: step }).map((_, index) => String.fromCharCode(96 + index + 1))

function numberToLetter(num: number) {
  const numbers: number[] = []
  while (true) {
    const n = Math.floor(num / step)
    numbers.push(n)
    num = num % step
    if (num < step) {
      numbers.push(num + 1)
      break
    }
  }
  return numbers.map(i => {
    return chars[i - 1]
  }).join('')
}

export function ListComponentView(props: ViewComponentProps<ListComponent>) {
  const component = props.component

  function reorder(is: boolean) {
    component.state.reorder = is
    const parentSlot = component.parent!
    const index = parentSlot.indexOf(component)

    const afterContent = parentSlot.sliceContent(index + 1)
    for (const item of afterContent) {
      if (item instanceof ListComponent) {
        if (item.state.reorder) {
          break
        }
        item.changeMarker.forceMarkDirtied()
      }
    }
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
    const ListType = component.state.type === 'UnorderedList' ? 'ul' : 'ol'
    const ulIcons = ['•', '◦', '▪']
    let icon: string
    let listStep = 0
    const indent = component.state.slot.getAttribute(textIndentAttr) || 0
    if (ListType === 'ul') {
      icon = ulIcons[indent % 3]
    } else {
      const parentSlot = component.parent!
      const index = parentSlot.indexOf(component)
      if (!component.state.reorder) {
        const beforeContent = parentSlot.sliceContent(0, index)
        while (beforeContent.length) {
          const content = beforeContent.pop()
          if (content instanceof ListComponent &&
            content.state.type === 'OrderedList') {
            const beforeIndent = content.state.slot.getAttribute(textIndentAttr) || 0
            if (beforeIndent === indent) {
              listStep++
              if (content.state.reorder) {
                break
              }
            } else if (beforeIndent < indent) {
              break
            }
          }
        }
      }

      const level = indent % 3
      if (level === 0) {
        icon = listStep + 1 + '.'
      } else if (level === 1) {
        icon = numberToLetter(listStep).toUpperCase() + '.'
      } else {
        icon = numberToLetter(listStep) + '.'
      }
    }
    return (
      <ListType ref={props.rootRef} data-component={component.name} data-reorder={(listStep === 0) + ''} class="xnote-list" style={{
        marginLeft: indent * 24 + 'px'
      }}>
        <li style={{
          justifyContent: align[component.state.slot.getAttribute(textAlignAttr)!],
          textAlign: component.state.slot.getAttribute(textAlignAttr) === 'justify' ? 'justify' : void 0
        }}>
          <div class="xnote-list-type">{
            (component.state.type === 'UnorderedList' || readonly() || output()) ?
              <span class="xnote-order-btn">{icon}</span>
              :
              <Dropdown menu={<>
                <MenuItem onClick={() => reorder(false)}>继续编号</MenuItem>
                <MenuItem onClick={() => reorder(true)}>重新编号</MenuItem>
              </>}>
                <Button style={{ color: 'inherit' }}>{icon}</Button>
              </Dropdown>
          }</div>
          <SlotRender
            slot={component.state.slot}
            class="xnote-list-content"
            renderEnv={readonly() || output()}
          />
        </li>
      </ListType>
    )
  }
}

export const listComponentLoader: ComponentLoader = {
  match(element: HTMLElement, returnableContentTypes): boolean {
    return returnableContentTypes.includes(ContentType.BlockComponent) && (element.tagName === 'UL' || element.tagName === 'OL')
  },
  read(element: HTMLElement, textbus: Textbus, slotParser: SlotParser): Component | Slot | void {
    const type = element.tagName === 'OL' ? 'OrderedList' : 'UnorderedList'
    if (element.dataset.component === ListComponent.componentName) {
      const slot = slotParser(new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ]), element.querySelector('.xnote-list-content') || document.createElement('div'))
      return new ListComponent(textbus, {
        slot,
        reorder: element.dataset.reorder !== 'false',
        type
      })
    }

    const result = new Slot([
      ContentType.BlockComponent
    ])
    Array.from(element.children).forEach((i, index) => {
      const slot = slotParser(new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ]), i as HTMLElement)
      const component = new ListComponent(textbus, {
        slot,
        reorder: index === 0,
        type
      })
      result.insert(component)
    })
    return result
  }
}

