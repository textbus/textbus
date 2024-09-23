import { withScopedCSS } from '@viewfly/scoped-css'
import { createRef, createSignal, inject, JSXNode, onMounted, onUnmounted, withAnnotation, } from '@viewfly/core'
import { useProduce } from '@viewfly/hooks'
import {
  Commander,
  ContentType,
  debounceTime,
  delay,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  RootComponentRef,
  sampleTime,
  Selection,
  Slot,
  Subscription,
  Textbus,
  throttleTime
} from '@textbus/core'
import { DomAdapter } from '@textbus/platform-browser'

import css from './left-toolbar.scoped.scss'
import { RefreshService } from '../../services/refresh.service'
import { MenuItem } from '../../components/menu-item/menu-item'
import { useActiveBlock } from '../hooks/active-block'
import { Divider } from '../../components/divider/divider'
import { useBlockTransform } from '../hooks/block-transform'
import { SourceCodeComponent } from '../../textbus/components/source-code/source-code.component'
import { RootComponent } from '../../textbus/components/root/root.component'
import { Dropdown } from '../../components/dropdown/dropdown'
import { TableComponent } from '../../textbus/components/table/table.component'
import { ParagraphComponent } from '../../textbus/components/paragraph/paragraph.component'
import { Button } from '../../components/button/button'
import { AttrTool } from '../_common/attr.tool'
import { ColorTool } from '../_common/color.tool'
import { InsertTool } from './insert-tool'
import { EditorService } from '../../services/editor.service'

export const LeftToolbar = withAnnotation({
  providers: [RefreshService]
}, function LeftToolbar() {
  const adapter = inject(DomAdapter)
  const textbus = inject(Textbus)
  const selection = inject(Selection)
  const rootComponentRef = inject(RootComponentRef)
  const refreshService = inject(RefreshService)
  const editorService = inject(EditorService)

  const checkStates = useActiveBlock()
  const toBlock = useBlockTransform()
  const activeSlot = createSignal<Slot | null>(null)

  function transform(v: string) {
    const active = activeSlot()
    if (active) {
      selection.setBaseAndExtent(active, 0, active, active.length)
      selection.restore()
      toBlock(v)
      activeSlot.set(selection.focusSlot)
      refreshService.onRefresh.next()
    }
  }

  const [positionSignal, updatePosition] = useProduce({
    left: 0,
    top: 0,
    display: false
  })


  const sub = editorService.onLeftToolbarCanVisibleChange.subscribe(() => {
    updatePosition(d => {
      d.display = editorService.canShowLeftToolbar
    })
  })

  onUnmounted(() => {
    sub.unsubscribe()
  })

  let isIgnoreMove = false

  onMounted(() => {
    const rootComponent = rootComponentRef.component as RootComponent
    const docContentContainer = adapter.getNativeNodeBySlot(rootComponent.state.content)!
    const sub = fromEvent(docContentContainer!, 'mousemove').pipe(
      filter(() => {
        return !isIgnoreMove
      }),
      map(ev => {
        let currentNode = ev.target as Node | null
        while (currentNode) {
          const slot = adapter.getSlotByNativeNode(currentNode as HTMLElement)
          if (slot) {
            if (slot?.parent?.type === ContentType.InlineComponent) {
              currentNode = currentNode.parentNode
              continue
            }
            return slot
          }
          currentNode = currentNode.parentNode
        }
        return null
      }),
      distinctUntilChanged(),
      filter(slot => {
        return !slot || slot !== rootComponent.state.content
      }),
      sampleTime(250),
      filter(() => {
        return !isShow()
      })
    ).subscribe(slot => {
      activeSlot.set(slot)
      if (slot) {
        checkStates(slot)
        isEmptyBlock.set(
          (slot.parent instanceof ParagraphComponent && slot.isEmpty) ||
          slot.parent instanceof SourceCodeComponent ||
          slot.parent instanceof TableComponent
        )
        const nativeNode = adapter.getNativeNodeByComponent(slot.parent!)!
        updatePosition(draft => {
          const containerRect = docContentContainer.getBoundingClientRect()
          const currentRect = nativeNode.getBoundingClientRect()
          draft.display = true
          draft.left = currentRect.left - containerRect.left
          draft.top = currentRect.top - containerRect.top + docContentContainer.offsetTop
        })
      } else {
        updatePosition(draft => {
          draft.display = false
        })
        isEmptyBlock.set(false)
      }
    })

    return () => sub.unsubscribe()
  })
  const subscription = merge(textbus.onChange, selection.onChange).pipe(
    debounceTime(20)
  ).subscribe(() => {
    if (activeSlot()) {
      return
    }
    refreshService.onRefresh.next()
  }).add(
    selection.onChange.pipe(throttleTime(30)).subscribe(() => {
      if (!selection.isCollapsed) {
        updatePosition(draft => {
          draft.display = false
        })
      }
    })
  )

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  const toolbarRef = createRef<HTMLElement>()
  const btnRef = createRef<HTMLElement>()
  const isShow = createSignal(false)

  onMounted(() => {
    let leaveSub: Subscription
    const bindLeave = function () {
      leaveSub = fromEvent(toolbarRef.current!, 'mouseleave').pipe(delay(200)).subscribe(() => {
        isShow.set(false)
      })
    }
    bindLeave()
    subscription.add(
      fromEvent(toolbarRef.current!, 'mouseenter').subscribe(() => {
        if (leaveSub) {
          leaveSub.unsubscribe()
        }
        bindLeave()
        isShow.set(true)
      })
    )
  })

  function applyBefore() {
    const slot = activeSlot()
    if (slot) {
      selection.selectSlot(slot)
      textbus.nextTick(() => {
        refreshService.onRefresh.next()
      })
    }
  }

  const commander = inject(Commander)

  function copy() {
    const slot = activeSlot()
    if (!slot) {
      return
    }
    selection.selectComponent(slot.parent!, true)
    commander.copy()
  }

  function cut() {
    const slot = activeSlot()
    if (!slot) {
      return
    }
    copy()
    remove()
  }


  function remove() {
    const slot = activeSlot()
    if (!slot) {
      return
    }
    if (slot.parent!.slots.length <= 1) {
      commander.removeComponent(slot.parent!)
    } else {
      selection.selectSlot(slot)
      commander.delete()
    }
  }

  const isEmptyBlock = createSignal(true)

  function changeIgnoreMove(b: boolean) {
    isIgnoreMove = b
  }

  return withScopedCSS(css, () => {
    const position = positionSignal()
    const slot = activeSlot()
    let activeNode = <span class="xnote-icon-pilcrow"/>
    const states = checkStates(slot)

    if (slot) {
      const types: [boolean, JSXNode][] = [
        [states.paragraph, <span class="xnote-icon-pilcrow"/>],
        [states.sourceCode, <span class="xnote-icon-source-code"/>],
        [states.blockquote, <span class="xnote-icon-quotes-right"/>],
        [states.todolist, <span class="xnote-icon-checkbox-checked"/>],
        [states.unorderedList, <span class="xnote-icon-list"/>],
        [states.orderedList, <span class="xnote-icon-list-numbered"/>],
        [states.table, <span class="xnote-icon-table"/>],
        [states.h1, <span class="xnote-icon-heading-h1"/>],
        [states.h2, <span class="xnote-icon-heading-h2"/>],
        [states.h3, <span class="xnote-icon-heading-h3"/>],
        [states.h4, <span class="xnote-icon-heading-h4"/>],
        [states.h5, <span class="xnote-icon-heading-h5"/>],
        [states.h6, <span class="xnote-icon-heading-h6"/>],
      ]

      for (const t of types) {
        if (t[0]) {
          activeNode = t[1]
          break
        }
      }
    }

    const activeParentComponent = activeSlot()?.parent
    const needInsert = activeParentComponent instanceof TableComponent || activeParentComponent instanceof SourceCodeComponent
    return (
      <div class="left-toolbar" ref={toolbarRef}>
        <div class="left-toolbar-btn-wrap" ref={btnRef} style={{
          left: position.left + 'px',
          top: position.top + 'px',
          display: position.display && selection.isCollapsed && editorService.canShowLeftToolbar ? 'block' : 'none'
        }}>
          <Dropdown toLeft={true} onExpendStateChange={changeIgnoreMove} abreast={true} style={{
            position: 'absolute',
            right: 0,
            top: 0
          }} menu={
            isEmptyBlock() ?
              <InsertTool replace={!needInsert} slot={activeSlot()}/>
              :
              <>
                <div class="btn-group">
                  <Button ordinary={true} highlight={states.paragraph} onClick={() => transform('paragraph')}>
                    <span class="xnote-icon-pilcrow"/>
                  </Button>
                  <Button ordinary={true} highlight={states.h1} onClick={() => transform('h1')}>
                    <span class="xnote-icon-heading-h1"/>
                  </Button>
                  <Button ordinary={true} highlight={states.h2} onClick={() => transform('h2')}>
                    <span class="xnote-icon-heading-h2"/>
                  </Button>
                  <Button ordinary={true} highlight={states.h3} onClick={() => transform('h3')}>
                    <span class="xnote-icon-heading-h3"/>
                  </Button>
                  <Button ordinary={true} highlight={states.h4} onClick={() => transform('h4')}>
                    <span class="xnote-icon-heading-h4"/>
                  </Button>
                  <Button ordinary={true} highlight={states.todolist} onClick={() => transform('todolist')}>
                    <span class="xnote-icon-checkbox-checked"/>
                  </Button>
                  <Button ordinary={true} highlight={states.orderedList} onClick={() => transform('ol')}>
                    <span class="xnote-icon-list-numbered"/>
                  </Button>
                  <Button ordinary={true} highlight={states.unorderedList} onClick={() => transform('ul')}>
                    <span class="xnote-icon-list"/>
                  </Button>
                  <Button ordinary={true} highlight={states.blockquote} onClick={() => transform('blockquote')}>
                    <span class="xnote-icon-quotes-right"/>
                  </Button>
                  <Button ordinary={true} highlight={states.sourceCode} onClick={() => transform('sourceCode')}>
                    <span class="xnote-icon-source-code"/>
                  </Button>
                </div>
                <Divider/>
                <AttrTool
                  style={{ display: 'block' }}
                  abreast={true}
                  slot={slot}
                  applyBefore={applyBefore}>
                  <MenuItem arrow={true} icon={<span class="xnote-icon-indent-decrease"/>}>缩进和对齐</MenuItem>
                </AttrTool>
                <ColorTool
                  style={{ display: 'block' }}
                  abreast={true}
                  applyBefore={applyBefore}
                >
                  <MenuItem arrow={true} icon={<span class="xnote-icon-color"/>}>颜色</MenuItem>
                </ColorTool>
                <Divider/>
                <MenuItem onClick={copy} icon={<span class="xnote-icon-copy"/>}>复制</MenuItem>
                <MenuItem onClick={remove} icon={<span class="xnote-icon-bin"/>}>删除</MenuItem>
                <MenuItem onClick={cut} icon={<span class="xnote-icon-cut"/>}>剪切</MenuItem>
                <Divider/>
                <Dropdown style={{ display: 'block' }} abreast={true} menu={<InsertTool hideTitle={true} slot={activeSlot()}/>}>
                  <MenuItem arrow={true} icon={<span class="xnote-icon-plus"/>}>在下面添加</MenuItem>
                </Dropdown>
              </>
          }>
            <button type="button" class="left-toolbar-btn">
              {
                isEmptyBlock() ?
                  <span>
                    <i class="xnote-icon-plus"></i>
                  </span>
                  :
                  <span>
                    {
                      activeNode
                    }
                    <i style="font-size: 12px" class="xnote-icon-more"></i>
                  </span>
              }
            </button>
          </Dropdown>
        </div>
      </div>
    )
  })
})
