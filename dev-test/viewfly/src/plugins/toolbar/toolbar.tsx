import { createRef, Fragment, getCurrentInstance, inject, onUnmounted, withAnnotation } from '@viewfly/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { debounceTime, delay, filter, fromEvent, map, merge, RootComponentRef, Selection, Subscription, Textbus } from '@textbus/core'
import { DomAdapter, Rect, SelectionBridge, VIEW_CONTAINER } from '@textbus/platform-browser'
import { useProduce } from '@viewfly/hooks'

import css from './toolbar.scoped.scss'
import { BoldTool } from '../_common/bold.tool'
import { ItalicTool } from '../_common/italic.tool'
import { StrikeThroughTool } from '../_common/strike-through.tool'
import { UnderlineTool } from '../_common/underline.tool'
import { RefreshService } from '../../services/refresh.service'
import { BlockTool } from '../_common/block.tool'
import { CodeTool } from '../_common/code.tool'
import { ColorTool } from '../_common/color.tool'
import { ToolbarItem } from '../../components/toolbar-item/toolbar-item'
import { AttrTool } from '../_common/attr.tool'
import { FontSizeTool } from '../_common/font-size.tool'
import { FontFamilyTool } from '../_common/font-family.tool'
import { EditorService } from '../../services/editor.service'
import { SourceCodeComponent } from '../../textbus/components/source-code/source-code.component'
import { LinkTool } from '../_common/link.tool'
import { MergeCellsTool } from '../_common/table/merge-cells.tool'
import { SplitCellsTool } from '../_common/table/split-cells.tool'
import { CellAlignTool } from '../_common/table/cell-align.tool'
import { TableComponent } from '../../textbus/components/table/table.component'
import { sum } from '../../textbus/components/table/_utils'
import { CellBackgroundTool } from '../_common/table/cell-background.tool'

export const Toolbar = withAnnotation({
  providers: [RefreshService]
}, function Toolbar() {
  const selection = inject(Selection)
  const viewDocument = inject(VIEW_CONTAINER)
  const rootComponentRef = inject(RootComponentRef)
  const adapter = inject(DomAdapter)
  const bridge = inject(SelectionBridge)
  const textbus = inject(Textbus)
  const editorService = inject(EditorService)
  const refreshService = inject(RefreshService)

  const subscription = merge(textbus.onChange, selection.onChange).pipe(
    debounceTime(20)
  ).subscribe(() => {
    refreshService.onRefresh.next()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  const [viewPosition, updateViewPosition] = useProduce({
    left: 0,
    top: 0,
    isHide: true,
    opacity: 0,
    transitionDuration: 0
  })

  let mouseupSubscription = new Subscription()
  const toolbarRef = createRef<HTMLElement>()

  function getTop() {
    const docRect = viewDocument.getBoundingClientRect()
    const toolbarHeight = 36
    // const documentHeight = document.documentElement.clientHeight
    let selectionFocusRect: Rect | null = null
    const commonAncestorComponent = selection.commonAncestorComponent
    if (commonAncestorComponent instanceof TableComponent) {
      const slots = commonAncestorComponent.getSelectedNormalizedSlots()!.map(item => {
        return item.cells.filter(i => {
          return i.visible
        }).map(cell => {
          return cell.raw.slot
        })
      }).flat()
      const startSlot = slots.at(0)!
      const endSlot = slots.at(-1)!
      const rect = commonAncestorComponent.getSelectedRect()!
      const startRect = (adapter.getNativeNodeBySlot(startSlot) as HTMLElement).getBoundingClientRect()
      const endEle = (adapter.getNativeNodeBySlot(endSlot) as HTMLElement).getBoundingClientRect()
      const width = sum(commonAncestorComponent.state.columnsConfig.slice(rect.x1, rect.x2))
      selectionFocusRect = {
        left: startRect.left + width / 2,
        top: startRect.top,
        height: endEle.bottom - startRect.top,
        width
      }
    } else {
      selectionFocusRect = bridge.getRect({
        slot: selection.focusSlot!,
        offset: selection.focusOffset!
      })
    }
    if (!selectionFocusRect) {
      return null
    }

    const centerLeft = selectionFocusRect.left
    const toBottom = selectionFocusRect.top < toolbarHeight + 10
    const top = toBottom ?
      selectionFocusRect.top + selectionFocusRect.height - docRect.top + 10 :
      selectionFocusRect.top - docRect.top - toolbarHeight - 10

    updateViewPosition(draft => {
      draft.transitionDuration = .15
      draft.left = centerLeft - docRect.left
      draft.top = top + 10
    })
    return top
  }

  const sub = textbus.onChange.pipe(debounceTime(100)).subscribe(() => {
    if (!viewPosition().isHide) {
      const top = getTop()
      if (top !== null) {
        updateViewPosition(draft => {
          draft.top = top
        })
      }
    }
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  function bindMouseup() {
    const docElement = adapter.getNativeNodeByComponent(rootComponentRef.component)!
    mouseupSubscription = fromEvent<MouseEvent>(docElement, 'mouseup').pipe(
      delay(),
      filter(ev => {
        const c = selection.commonAncestorComponent
        if (c instanceof TableComponent) {
          const b = !c.ignoreSelectionChanges
          c.ignoreSelectionChanges = false
          return b
        }
        return !ev.composedPath().includes(toolbarRef.current!)
      }),
      delay(100),
      filter(() => {
        return !selection.isCollapsed && !(selection.commonAncestorComponent instanceof SourceCodeComponent)
      }),
      map(getTop),
      delay(200),
    ).subscribe((top) => {
      if (top !== null) {
        updateViewPosition(draft => {
          draft.isHide = false
          draft.opacity = 1
          draft.top = top
        })
      }
    })
  }

  const mousedownSubscription = fromEvent<MouseEvent>(document, 'mousedown').subscribe((ev) => {
    if (ev.composedPath().includes(toolbarRef.current!)) {
      return
    }
    mouseupSubscription.unsubscribe()
    updateViewPosition(draft => {
      draft.opacity = 0
      draft.isHide = true
      draft.transitionDuration = 0
    })
    bindMouseup()
  })

  const instance = getCurrentInstance()

  function hideToolbar() {
    editorService.hideInlineToolbar = true
    instance.markAsDirtied()
  }

  onUnmounted(() => {
    mousedownSubscription.unsubscribe()
    mouseupSubscription.unsubscribe()
  })

  return withScopedCSS(css, () => {
    const p = viewPosition()
    return (
      <div class="toolbar" ref={toolbarRef} style={{
        left: p.left + 'px',
        top: p.top + 'px',
        pointerEvents: p.isHide ? 'none' : 'initial',
        opacity: p.opacity,
        display: editorService.hideInlineToolbar ? 'none' : '',
        transitionDuration: p.transitionDuration + 's'
      }}>
        {
          selection.commonAncestorComponent instanceof TableComponent && <Fragment key="table">
            <ToolbarItem>
              <MergeCellsTool/>
            </ToolbarItem>
            <ToolbarItem>
              <SplitCellsTool/>
            </ToolbarItem>
            <ToolbarItem>
              <CellBackgroundTool/>
            </ToolbarItem>
            <ToolbarItem>
              <CellAlignTool/>
            </ToolbarItem>
          </Fragment>
        }
        <ToolbarItem>
          <BlockTool/>
        </ToolbarItem>
        <ToolbarItem>
          <AttrTool/>
        </ToolbarItem>
        <ToolbarItem>
          <BoldTool/>
        </ToolbarItem>
        <ToolbarItem>
          <ItalicTool/>
        </ToolbarItem>
        <ToolbarItem>
          <StrikeThroughTool/>
        </ToolbarItem>
        <ToolbarItem>
          <UnderlineTool/>
        </ToolbarItem>
        <ToolbarItem>
          <FontSizeTool/>
        </ToolbarItem>
        <ToolbarItem>
          <FontFamilyTool/>
        </ToolbarItem>
        <ToolbarItem>
          <LinkTool hideToolbar={hideToolbar}/>
        </ToolbarItem>
        <ToolbarItem>
          <CodeTool/>
        </ToolbarItem>
        <ToolbarItem>
          <ColorTool/>
        </ToolbarItem>
      </div>
    )
  })
})
