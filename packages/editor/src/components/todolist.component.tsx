import {
  Commander,
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onEnter,
  Selection,
  Slot,
  useContext,
  useSelf,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { paragraphComponent } from './paragraph.component'


export interface TodoListSlotState {
  active: boolean
  disabled: boolean
}

export const todolistComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TodolistComponent',
  separable: true,
  zenCodingSupport: {
    match: /^-\s\[(x|\s)?\]$/,
    key: ' ',
    generateInitData(content: string): ComponentData<void, TodoListSlotState> {
      const isChecked = content.charAt(3) === 'x'
      return {
        slots: [
          new Slot<TodoListSlotState>([
            ContentType.Text,
            ContentType.InlineComponent
          ], {
            active: isChecked,
            disabled: false
          })
        ]
      }
    }
  },
  setup(initData: ComponentData<void, TodoListSlotState>) {
    const {Text, InlineComponent} = ContentType
    const slots = useSlots<TodoListSlotState>(initData.slots || [
      new Slot<TodoListSlotState>([Text, InlineComponent])
    ])
    if (slots.length === 0) {
      slots.push(new Slot<TodoListSlotState>([Text, InlineComponent]))
    }
    const injector = useContext()
    const self = useSelf()
    const selection = injector.get(Selection)
    const commander = injector.get(Commander)

    onEnter(ev => {
      const slot = ev.target
      const index = ev.data.index
      ev.preventDefault()
      if (slot.isEmpty && index === 0 && slots.length > 1 && slot === slots.last) {
        const p = paragraphComponent.createInstance(injector)
        commander.insertAfter(p, self)
        slots.remove(slot)
        const firstSlot = p.slots.get(0)!
        selection.setPosition(firstSlot, 0)
      } else {
        const nextSlot = slot.cut(index)
        slots.insertAfter(nextSlot, slot)
        selection.setPosition(nextSlot, 0)
      }
    })
    const stateCollection = [{
      active: false,
      disabled: false
    }, {
      active: true,
      disabled: false
    }, {
      active: false,
      disabled: true
    }, {
      active: true,
      disabled: true
    }]

    function getStateIndex(active: boolean, disabled: boolean) {
      for (let i = 0; i < 4; i++) {
        const item = stateCollection[i]
        if (item.active === active && item.disabled === disabled) {
          return i
        }
      }
      return -1
    }

    return {
      render(_, slotRender): VElement {
        return (
          <tb-todolist>
            {
              slots.toArray().map(slot => {
                const state = slot.state!
                const classes = ['tb-todolist-state']

                if (state.active) {
                  classes.push('tb-todolist-state-active')
                }
                if (state.disabled) {
                  classes.push('tb-todolist-state-disabled')
                }
                return (
                  <div class="tb-todolist-item">
                    <div class="tb-todolist-btn">
                      <div class={classes.join(' ')} onClick={() => {
                        const i = (getStateIndex(state.active, state.disabled) + 1) % 4
                        const newState = stateCollection[i]
                        slot.updateState(draft => {
                          draft.active = newState.active
                          draft.disabled = newState.disabled
                        })
                      }}/>
                    </div>
                    {
                      slotRender(slot, () => {
                        return <div class="tb-todolist-content"/>
                      })
                    }
                  </div>
                )
              })
            }
          </tb-todolist>
        )
      }
    }
  }
})

export const todolistComponentLoader: ComponentLoader = {
  component: todolistComponent,
  resources: {
    styles: [
      `
tb-todolist {
  display: block;
  margin-top: 1em;
  margin-bottom: 1em;
}
.tb-todolist-item {
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  display: flex;
}
.tb-todolist-btn {
  margin-right: 0.6em;
}
.tb-todolist-state {
  display: inline-block;
  margin-top: 3px;
  width: 12px;
  height: 12px;
  border: 2px solid #1296db;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  box-sizing: content-box;
}
.tb-todolist-state:after {
  content: "";
  position: absolute;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  box-sizing: content-box;
  left: 3px;
  top: 1px;
  width: 4px;
  height: 6px;
  transform: rotateZ(45deg);
}
.tb-todolist-state-active:after {
  border-color: #1296db;
}
.tb-todolist-state-disabled {
  opacity: 0.5;
}
.tb-todolist-content {
  flex: 1;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-todolist'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    const listConfig = Array.from(element.children).map(child => {
      const stateElement = child.querySelector('.tb-todo-list-state')
      return {
        childSlot: child.querySelector('.tb-todo-list-content') as HTMLElement,
        slot: new Slot<TodoListSlotState>([
          ContentType.Text,
          ContentType.InlineComponent
        ], {
          active: !!stateElement?.classList.contains('tb-todolist-state-active'),
          disabled: !!stateElement?.classList.contains('tb-todolist-state-disabled')
        })
      }
    })

    return todolistComponent.createInstance(context, {
      slots: listConfig.map(i => {
        return slotParser(i.slot, i.childSlot)
      })
    })
  }
}
