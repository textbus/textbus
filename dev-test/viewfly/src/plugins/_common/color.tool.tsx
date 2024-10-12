import { useProduce } from '@viewfly/hooks'
import { inject, onUnmounted, createSignal, Props } from '@viewfly/core'
import { Commander, Query, QueryStateType, Range, Slot, Selection } from '@textbus/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { HTMLAttributes } from '@viewfly/platform-browser'

import { Button } from '../../components/button/button'
import { RefreshService } from '../../services/refresh.service'
import { backgroundColorFormatter, colorFormatter } from '../../textbus/formatters/_api'
import { Dropdown, DropdownProps } from '../../components/dropdown/dropdown'
import css from './color-tool.scoped.scss'

export interface ColorToolProps extends Props {
  abreast?: DropdownProps['abreast']
  style?: HTMLAttributes<HTMLElement>['style']
  slot?: Slot | null

  applyBefore?(): void
}

export function ColorTool(props: ColorToolProps) {
  const query = inject(Query)
  const refreshService = inject(RefreshService)
  const commander = inject(Commander)
  const selection = inject(Selection)

  const textColor = createSignal('')
  const backgroundColor = createSignal('')

  const [viewModel] = useProduce({
    highlight: false,
    disabled: false,
  })

  function updateCheckState() {
    if (!props.slot && !selection.isSelected) {
      return
    }
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
    const textState = query.queryFormatByRange(colorFormatter, range)
    const backgroundState = query.queryFormatByRange(backgroundColorFormatter, range)

    textColor.set(textState.state === QueryStateType.Enabled ? textState.value! : '')
    backgroundColor.set(backgroundState.state === QueryStateType.Enabled ? backgroundState.value! : '')
  }

  const sub = refreshService.onRefresh.subscribe(() => {
    updateCheckState()
  })

  updateCheckState()

  onUnmounted(() => {
    sub.unsubscribe()
  })

  const textColors: string[] = [
    '#000',
    '#aaa',
    '#ff2e2e',
    '#ff8d45',
    '#ffdf14',
    '#5eec75',
    '#5dfaff',
    '#1296db',
    '#617fff',
    '#c459ff',
    '#fff',
  ]

  const backgroundColors: string[] = [
    '#aaa',
    '#ef7373',
    '#ec9c6a',
    '#dccc64',
    '#96e3a3',
    '#a1e2e3',
    '#90a0e5',
    '#c596e0',
  ]

  return withScopedCSS(css, () => {
    const vm = viewModel()
    return (
      <Dropdown style={props.style} width={'180px'} abreast={props.abreast} trigger={'hover'} menu={
        <div>
          <div class="color-type">文字颜色</div>
          <div class="text-colors">
            <div class={{
              'no-background': true,
              active: textColor() === ''
            }} onClick={() => {
              props.applyBefore?.()
              commander.unApplyFormat(colorFormatter)
            }}>
            </div>
            {
              textColors.map(c => {
                return <div class={{
                  active: textColor() === c
                }} onClick={() => {
                  props.applyBefore?.()
                  commander.applyFormat(colorFormatter, c)
                }} style={{ color: c }}>A</div>
              })
            }
          </div>
          <div class="color-type">背景颜色</div>
          <div class="background-colors">
            <div class={{
              active: backgroundColor() === '',
              'no-background': true
            }} onClick={() => {
              props.applyBefore?.()
              commander.unApplyFormat(backgroundColorFormatter)
            }}></div>
            {
              backgroundColors.map(c => {
                return <div class={{
                  active: backgroundColor() === c
                }} onClick={() => {
                  props.applyBefore?.()
                  commander.applyFormat(backgroundColorFormatter, c)
                }} style={{ backgroundColor: c }}>A</div>
              })
            }
          </div>
        </div>
      }>
        {
          props.children || <Button highlight={vm.highlight} arrow={true} disabled={vm.disabled}>
          <span class="background">
            <span style={{
              backgroundColor: backgroundColor(),
              color: textColor()
            }}>
              <span class="xnote-icon-color"></span>
            </span>
          </span>
          </Button>
        }
      </Dropdown>
    )
  })
}
