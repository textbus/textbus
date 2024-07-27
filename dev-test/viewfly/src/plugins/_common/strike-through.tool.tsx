import { useProduce } from '@viewfly/hooks'
import { inject, onUnmounted } from '@viewfly/core'
import { Query, QueryStateType, Textbus } from '@textbus/core'

import { Button } from '../../components/button/button'
import { RefreshService } from '../../services/refresh.service'
import { strikeThroughFormatter, toggleStrikeThrough } from '../../textbus/formatters/_api'

export function StrikeThroughTool() {
  const query = inject(Query)
  const refreshService = inject(RefreshService)
  const textbus = inject(Textbus)

  const [viewModel, update] = useProduce({
    highlight: false,
    disabled: false,
  })

  function toggle() {
    toggleStrikeThrough(textbus)
  }

  const sub = refreshService.onRefresh.subscribe(() => {
    const state = query.queryFormat(strikeThroughFormatter)
    update(draft => {
      draft.highlight = state.state === QueryStateType.Enabled
    })
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  return () => {
    const vm = viewModel()
    return <Button highlight={vm.highlight} disabled={vm.disabled} onClick={toggle}><span class="xnote-icon-strikethrough"></span></Button>
  }
}
