import {
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onDestroy, RenderMode,
  Slot,
  useContext,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { Injector } from '@tanbo/di'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'

import { blockComponent } from './block.component'
import { fontSizeFormatter } from '../formatters/_api'
import { boldFormatter } from '../formatters/inline-element.formatter'
import { paragraphComponent } from './paragraph.component'

export interface StepComponentState {
  step: number
}

export function createStepSlot(injector: Injector) {
  const slot = new Slot([
    ContentType.Text,
    ContentType.InlineComponent,
    ContentType.BlockComponent
  ])
  const title = blockComponent.createInstance(injector)
  title.slots.first!.insert('标题', [
    [fontSizeFormatter, '18px'],
    [boldFormatter, true]
  ])
  const content = paragraphComponent.createInstance(injector)
  content.slots.first!.insert('描述信息...')
  slot.insert(title)
  slot.insert(content)
  return slot
}

export const stepComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'StepComponent',
  setup(initData?: ComponentInitData<StepComponentState>) {
    let state = initData?.state || {
      step: 0
    }
    const injector = useContext()
    const slots = useSlots(initData?.slots || [])
    if (slots.length === 0) {
      slots.push(
        createStepSlot(injector)
      )
    }
    const stateController = useState<StepComponentState>(state)
    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })

    onDestroy(() => {
      sub.unsubscribe()
    })
    return {
      render(slotRender, renderMode): VElement {
        const currentStep = state.step
        return (
          <tb-step step={state.step}>
            {
              slots.toArray().map((slot, index) => {
                let state = 'tb-waiting'
                if (index < currentStep) {
                  state = 'tb-complete'
                } else if (index === currentStep) {
                  state = 'tb-current'
                }
                return (
                  <div class={'tb-step-item ' + state}>
                    <div class="tb-step-item-header">
                      <div class="tb-step-item-line"/>
                      <div class="tb-step-item-icon" onClick={() => {
                        let step: number
                        if (index === currentStep) {
                          step = index + 1
                        } else if (index + 1 === currentStep) {
                          step = index - 1
                        } else {
                          step = index
                        }
                        stateController.update(draft => {
                          draft.step = step
                        })
                      }}>{index + 1}</div>
                    </div>
                    {
                      slotRender(slot, children => {
                        return <div class="tb-step-item-content">{children}</div>
                      })
                    }
                    {
                      renderMode === RenderMode.Editing && <span class="tb-step-item-add" onClick={
                        () => {
                          slots.insertByIndex(createStepSlot(injector), index + 1)
                        }
                      }/>
                    }
                  </div>
                )
              })
            }
          </tb-step>
        )
      }
    }
  }
})

export const stepComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-step'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    return stepComponent.createInstance(context, {
      state: {
        step: Number(element.getAttribute('step')) || 0
      },
      slots: Array.from(element.children).map(child => {
        return slotParser(new Slot([
          ContentType.BlockComponent,
          ContentType.InlineComponent,
          ContentType.Text
        ]), child.querySelector('.tb-step-item-content') as HTMLElement)
      })
    })
  }
}
