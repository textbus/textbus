import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { ContentType, createVNode, Slot, Textbus } from '@textbus/core'
import { ComponentLoader, DomAdapter, SlotParser } from '@textbus/platform-browser'

import { createStepItem, StepComponent } from './step.component'
import { useOutput } from '../../hooks/use-output'
import { useReadonly } from '../../hooks/use-readonly'
import './step.component.scss'
import { Button } from '../../../components/button/button'

export function StepComponentView(props: ViewComponentProps<StepComponent>) {
  const adapter = inject(DomAdapter)
  const textbus = inject(Textbus)
  const isOutput = useOutput()
  const isReadonly = useReadonly()

  return () => {
    const component = props.component
    const currentStep = component.state.step
    return (
      <div class="xnote-step" data-step={currentStep} ref={props.rootRef} data-component={StepComponent.componentName}>
        {
          component.state.items.map((item, index) => {
            let state = 'xnote-waiting'
            if (index < currentStep) {
              state = 'xnote-complete'
            } else if (index === currentStep) {
              state = 'xnote-current'
            }
            return (
              <div class={'xnote-step-item ' + state} key={item.slot.id}>
                <div class="xnote-step-item-header">
                  <div class="xnote-step-item-line"/>
                  <div class="xnote-step-item-icon" onClick={() => {
                    if (index === currentStep) {
                      component.state.step = index + 1
                    } else if (index + 1 === currentStep) {
                      component.state.step = index - 1
                    } else {
                      component.state.step = index
                    }
                  }}>{index + 1}</div>
                </div>
                {
                  !isOutput() && !isReadonly() && <div class="xnote-step-tools">
                    <Button class="xnote-step-add xnote-icon-plus" onClick={() => {
                      const index = component.state.items.indexOf(item) + 1
                      component.state.items.splice(index, 0, createStepItem(textbus))
                    }}></Button>
                    <Button class="xnote-step-add xnote-icon-bin" onClick={() => {
                      const index = component.state.items.indexOf(item)
                      component.state.items.splice(index, 1)
                    }}></Button>
                  </div>
                }
                {
                  adapter.slotRender(item.slot, children => {
                    return createVNode('div', {
                      class: 'xnote-step-item-content'
                    }, children)
                  }, isOutput() || isReadonly())
                }
              </div>
            )
          })
        }
      </div>
    )
  }
}

export const stepComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.dataset.component === StepComponent.componentName
  },
  read(element: HTMLElement, context: Textbus, slotParser: SlotParser) {
    return new StepComponent(context, {
      step: Number(element.dataset.step) || 0,
      items: Array.from(element.children).map(child => {
        const slot = new Slot([
          ContentType.BlockComponent
        ])
        return {
          slot: slotParser(slot, child.querySelector('.xnote-step-item-content') as HTMLElement ||
            document.createElement('div'))
        }
      })
    })
  }
}
