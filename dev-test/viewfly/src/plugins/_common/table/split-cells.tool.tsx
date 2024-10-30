import { useProduce } from '@viewfly/hooks'
import { inject, onUnmounted } from '@viewfly/core'
import { Selection } from '@textbus/core'

import { Button } from '../../../components/button/button'
import { RefreshService } from '../../../services/refresh.service'
import { TableComponent } from '../../../textbus/components/table/table.component'

export function SplitCellsTool() {
  const refreshService = inject(RefreshService)
  const selection = inject(Selection)

  const [viewModel, update] = useProduce({
    highlight: false,
    disabled: false,
  })

  function split() {
    const commonAncestorComponent = selection.commonAncestorComponent
    if (commonAncestorComponent instanceof TableComponent) {
      commonAncestorComponent.splitCellsBySelection()
    }
  }

  const sub = refreshService.onRefresh.subscribe(() => {
    const commonAncestorComponent = selection.commonAncestorComponent
    update(draft => {
      if (commonAncestorComponent instanceof TableComponent) {
        const slots = commonAncestorComponent.getSelectedNormalizedSlots()
        if (slots) {
          for (const item of slots) {
            for (const cell of item.cells) {
              if (cell.visible && cell.colspan > 1 || cell.colspan > 1) {
                draft.disabled = false
                return
              }
            }
          }
        }
      }
      draft.disabled = true
    })
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  return () => {
    const vm = viewModel()
    return <Button highlight={vm.highlight} disabled={vm.disabled} onClick={split}><span class="xnote-icon-split-cells"></span></Button>
  }
}
