import { inject, onUnmounted, Props } from '@viewfly/core'
import { Commander, Query, QueryStateType, Range, Selection, Slot } from '@textbus/core'
import { HTMLAttributes } from '@viewfly/platform-browser'
import { withScopedCSS } from '@viewfly/scoped-css'
import { useProduce } from '@viewfly/hooks'

import css from './block-tool.scoped.scss'
import { MenuItem } from '../../components/menu-item/menu-item'
import { Button } from '../../components/button/button'
import { Dropdown, DropdownProps } from '../../components/dropdown/dropdown'
import { Divider } from '../../components/divider/divider'
import { RefreshService } from '../../services/refresh.service'
import { textAlignAttr } from '../../textbus/attributes/text-align.attr'
import { textIndentAttr } from '../../textbus/attributes/text-indent.attr'
import { Keymap } from '../../components/keymap/keymap'

export interface AttrToolProps extends Props {
  abreast?: DropdownProps['abreast']
  style?: HTMLAttributes<HTMLElement>['style']
  slot?: Slot | null

  applyBefore?(): void
}

export function AttrTool(props: AttrToolProps) {
  const commander = inject(Commander)
  const selection = inject(Selection)
  const query = inject(Query)
  const refreshService = inject(RefreshService)

  const [checkStates, setCheckStates] = useProduce({
    textAlign: 'left',
    textIndent: 0
  })

  function updateCheckStates() {
    if (!props.slot && !selection.isSelected) {
      return
    }
    setCheckStates(draft => {
      const range: Range = props.slot ? {
        startSlot: props.slot,
        endSlot: props.slot,
        startOffset: 0,
        endOffset: props.slot.length
      } : {
        startSlot: selection.startSlot!,
        startOffset: selection.startOffset!,
        endSlot: selection.endSlot!,
        endOffset: selection.endOffset!
      }
      const textAlignState = query.queryAttributeByRange(textAlignAttr, range)
      const textIndentState = query.queryAttributeByRange(textIndentAttr, range)

      draft.textAlign = textAlignState.state === QueryStateType.Enabled ? textAlignState.value! : 'left'
      draft.textIndent = textIndentState.state === QueryStateType.Enabled ? textIndentState.value! : 0
    })
  }

  updateCheckStates()

  const subscription = refreshService.onRefresh.subscribe(() => {
    updateCheckStates()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  function updateAttr(value: any) {
    props.applyBefore?.()
    switch (value) {
      case 't-l':
        commander.applyAttribute(textAlignAttr, '')
        break
      case 't-r':
        commander.applyAttribute(textAlignAttr, 'right')
        break
      case 't-c':
        commander.applyAttribute(textAlignAttr, 'center')
        break
      case 't-j':
        commander.applyAttribute(textAlignAttr, 'justify')
        break
      case 'i+':
        selection.getBlocks().forEach(block => {
          const oldIndent = block.slot.getAttribute(textIndentAttr)
          let value = 1
          if (oldIndent) {
            value = oldIndent + 1
          }
          block.slot.setAttribute(textIndentAttr, value)
        })
        break
      case 'i-':
        selection.getBlocks().forEach(block => {
          const oldIndent = block.slot.getAttribute(textIndentAttr)
          let value = 0
          if (oldIndent) {
            value = oldIndent - 1
          }
          block.slot.setAttribute(textIndentAttr, value)
        })
        break
    }
  }

  return withScopedCSS(css, () => {
    const states = checkStates()
    return (
      <Dropdown width={'auto'} style={props.style} abreast={props.abreast} onCheck={updateAttr} trigger={'hover'} menu={[
        {
          label: <MenuItem icon={<span class="xnote-icon-paragraph-left"/>} desc={<Keymap keymap={{ key: 'L', modKey: true }}/>}
                           checked={states.textAlign === 'left'}>左对齐</MenuItem>,
          value: 't-l'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-paragraph-right"/>} desc={<Keymap keymap={{ key: 'R', modKey: true }}/>}
                           checked={states.textAlign === 'right'}>右对齐</MenuItem>,
          value: 't-r'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-paragraph-center"/>} desc={<Keymap keymap={{ key: 'E', modKey: true }}/>}
                           checked={states.textAlign === 'center'}>居中对齐</MenuItem>,
          value: 't-c'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-paragraph-justify"/>} desc={<Keymap keymap={{ key: 'J', modKey: true }}/>}
                           checked={states.textAlign === 'justify'}>分散对齐</MenuItem>,
          value: 't-j'
        }, {
          label: <Divider/>,
          value: ''
        }, {
          label: <MenuItem desc={<Keymap keymap={{ key: 'Tab' }}/>} icon={<span class="xnote-icon-indent-increase"/>}>增加缩进</MenuItem>,
          value: 'i+'
        }, {
          label: <MenuItem desc={<Keymap keymap={{ key: 'Tab', shiftKey: true }}/>}
                           icon={<span class="xnote-icon-indent-decrease"/>}>减少缩进</MenuItem>,
          value: 'i-'
        }
      ]}>
        {
          props.children || <Button arrow={true} highlight={false}>
            <span class={`xnote-icon-paragraph-${states.textAlign || 'left'} icon`}/>
          </Button>
        }
      </Dropdown>
    )
  })
}
