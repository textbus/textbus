import {
  Commander,
  Component,
  ComponentStateLiteral,
  ContentType,
  Keyboard, Query, QueryStateType,
  Registry,
  Selection,
  Slot,
  Textbus,
  ZenCodingGrammarInterceptor,
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { ViewComponentProps } from '@textbus/adapter-viewfly'

import './blockquote.component.scss'
import { deltaToBlock, ParagraphComponent } from '../paragraph/paragraph.component'
import { useBlockContent } from '../../hooks/use-block-content'
import { useReadonly } from '../../hooks/use-readonly'
import { useOutput } from '../../hooks/use-output'
import { textIndentAttr } from '../../attributes/text-indent.attr'
import { SlotRender } from '../SlotRender'

export interface BlockquoteComponentState {
  slot: Slot
}

export class BlockquoteComponent extends Component<BlockquoteComponentState> {
  static type = ContentType.BlockComponent
  static componentName = 'BlockquoteComponent'
  static zenCoding: ZenCodingGrammarInterceptor<BlockquoteComponentState> = {
    key: ' ',
    match(content, textbus) {
      const selection = textbus.get(Selection)
      if (selection.commonAncestorComponent instanceof ParagraphComponent) {
        return /^>$/.test(content)
      }
      return false
    },
    createState(_, textbus): BlockquoteComponentState {
      const selection = textbus.get(Selection)
      const commonAncestorSlot = selection.commonAncestorSlot!

      const slot = new Slot([
        ContentType.BlockComponent
      ])
      if (commonAncestorSlot?.hasAttribute(textIndentAttr)) {
        slot.setAttribute(textIndentAttr, commonAncestorSlot.getAttribute(textIndentAttr))
      }
      return {
        slot
      }
    }
  }

  static fromJSON(textbus: Textbus, json: ComponentStateLiteral<BlockquoteComponentState>) {
    const slot = textbus.get(Registry).createSlot(json.slot)
    return new BlockquoteComponent(textbus, {
      slot
    })
  }

  constructor(textbus: Textbus, state: BlockquoteComponentState = {
    slot: new Slot([
      ContentType.BlockComponent
    ])
  }) {
    super(textbus, state)
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }

  override setup() {
    useBlockContent(this.state.slot)
  }
}


export function toBlockquote(textbus: Textbus) {
  const query = textbus.get(Query)
  const commander = textbus.get(Commander)
  const selection = textbus.get(Selection)

  const state = query.queryComponent(BlockquoteComponent)
  if (state.state === QueryStateType.Enabled) {
    const current = state.value!
    const parent = current.parent!

    const index = parent.indexOf(current)

    parent.retain(index)

    commander.removeComponent(current)

    current.slots.at(0)!.sliceContent().forEach(i => {
      parent.insert(i)
    })
  } else {
    const block = new BlockquoteComponent(textbus)
    const slot = block.state.slot
    if (selection.startSlot === selection.endSlot) {
      const parentComponent = selection.startSlot!.parent!
      const parentSlot = parentComponent.parent!
      const position = parentSlot.indexOf(parentComponent)
      slot.insert(parentComponent)
      parentSlot.retain(position)
      parentSlot.insert(block)
    } else {
      const commonAncestorSlot = selection.commonAncestorSlot!
      const scope = selection.getCommonAncestorSlotScope()!
      commonAncestorSlot.cut(scope.startOffset, scope.endOffset).sliceContent().forEach(i => {
        slot.insert(i)
      })
      commonAncestorSlot.retain(scope.startOffset)
      commonAncestorSlot.insert(block)
    }
  }
}

export function registerBlockquoteShortcut(textbus: Textbus) {
  const keyboard = textbus.get(Keyboard)
  keyboard.addShortcut({
    keymap: {
      modKey: true,
      key: '\''
    },
    action(): boolean | void {
      toBlockquote(textbus)
    }
  })
}

export function BlockquoteView(props: ViewComponentProps<BlockquoteComponent>) {
  const readonly = useReadonly()
  const output = useOutput()
  return () => {
    const slot = props.component.state.slot
    return (
      <blockquote class="xnote-blockquote" ref={props.rootRef} data-component={props.component.name}>
        <SlotRender slot={slot} renderEnv={readonly() || output()}/>
      </blockquote>
    )
  }
}

export const blockquoteComponentLoader: ComponentLoader = {
  match(element: HTMLElement, returnableContentTypes): boolean {
    return returnableContentTypes.includes(ContentType.BlockComponent) && element.tagName === 'BLOCKQUOTE'
  },
  read(element: HTMLElement, textbus: Textbus, slotParser: SlotParser): Component {
    const delta = slotParser(new Slot([
      ContentType.BlockComponent,
      ContentType.InlineComponent,
      ContentType.Text
    ]), element).toDelta()

    const slot = new Slot([
      ContentType.BlockComponent,
    ])

    deltaToBlock(delta, textbus).forEach(i => {
      slot.insert(i)
    })
    return new BlockquoteComponent(textbus, {
      slot
    })
  },
}
