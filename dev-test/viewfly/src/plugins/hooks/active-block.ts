import { useProduce } from '@viewfly/hooks'
import { Query, QueryStateType, Range, Selection, Slot } from '@textbus/core'
import { inject, onUnmounted } from '@viewfly/core'

import { headingAttr } from '../../textbus/attributes/heading.attr'
import { RefreshService } from '../../services/refresh.service'
import { ParagraphComponent } from '../../textbus/components/paragraph/paragraph.component'
import { TableComponent } from '../../textbus/components/table/table.component'
import { TodolistComponent } from '../../textbus/components/todolist/todolist.component'
import { BlockquoteComponent } from '../../textbus/components/blockqoute/blockquote.component'
import { SourceCodeComponent } from '../../textbus/components/source-code/source-code.component'
import { ListComponent } from '../../textbus/components/list/list.component'

export function useActiveBlock() {
  const query = inject(Query)
  const selection = inject(Selection)
  const refreshService = inject(RefreshService)
  const [checkStates, setCheckStates] = useProduce({
    paragraph: false,
    h1: false,
    h2: false,
    h3: false,
    h4: false,
    h5: false,
    h6: false,
    orderedList: false,
    unorderedList: false,
    table: false,
    todolist: false,
    blockquote: false,
    sourceCode: false,
    highlightBox: false
  })

  function updateCheckStates(range: Range) {
    setCheckStates(draft => {
      const heading = query.queryAttributeByRange(headingAttr, range)
      draft.paragraph = query.queryComponentByRange(ParagraphComponent, range).state === QueryStateType.Enabled
      draft.h1 = draft.h2 = draft.h3 = draft.h4 = draft.h5 = draft.h6 = false
      if (heading.state === QueryStateType.Enabled) {
        draft[heading.value as any] = true
        draft.paragraph = false
      }
      const queryList = query.queryComponentByRange(ListComponent, range)
      draft.unorderedList = queryList.state === QueryStateType.Enabled && queryList.value!.state.type === 'UnorderedList'
      draft.orderedList = queryList.state === QueryStateType.Enabled && queryList.value!.state.type === 'OrderedList'
      draft.table = query.queryComponentByRange(TableComponent, range).state === QueryStateType.Enabled
      draft.todolist = query.queryComponentByRange(TodolistComponent, range).state === QueryStateType.Enabled
      draft.blockquote = query.queryComponentByRange(BlockquoteComponent, range).state === QueryStateType.Enabled
      draft.sourceCode = query.queryComponentByRange(SourceCodeComponent, range).state === QueryStateType.Enabled
    })
  }

  const subscription = refreshService.onRefresh.subscribe(() => {
    if (!selection.isSelected) {
      return
    }
    updateCheckStates({
      startOffset: selection.startOffset!,
      startSlot: selection.startSlot!,
      endSlot: selection.endSlot!,
      endOffset: selection.endOffset!
    })
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return function (slot: Slot | null = null) {
    if (slot) {
      updateCheckStates({
        startOffset: 0,
        endOffset: slot.length,
        startSlot: slot,
        endSlot: slot
      })
    } else if (selection.isSelected) {
      updateCheckStates({
        startOffset: selection.startOffset!,
        startSlot: selection.startSlot!,
        endSlot: selection.endSlot!,
        endOffset: selection.endOffset!
      })
    }
    return checkStates()
  }
}
