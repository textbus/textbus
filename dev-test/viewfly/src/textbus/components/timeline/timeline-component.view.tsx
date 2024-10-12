import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { ContentType, createVNode, Slot, Textbus } from '@textbus/core'
import { ComponentLoader, DomAdapter, SlotParser } from '@textbus/platform-browser'

import { createTimelineItem, TimelineComponent } from './timeline.component'
import { useOutput } from '../../hooks/use-output'
import { useReadonly } from '../../hooks/use-readonly'
import './timeline.component.scss'
import { Button } from '../../../components/button/button'

export function TimelineComponentView(props: ViewComponentProps<TimelineComponent>) {
  const adapter = inject(DomAdapter)
  const textbus = inject(Textbus)
  const isOutput = useOutput()
  const isReadonly = useReadonly()

  return () => {
    const component = props.component
    return (
      <div class="xnote-timeline" ref={props.rootRef} data-component={TimelineComponent.componentName}>
        {
          component.state.items.map(item => {
            return (
              <div class="xnote-timeline-item" key={item.slot.id}>
                <div class="xnote-timeline-line" style={{
                  borderColor: item.theme,
                }}/>
                <div class="xnote-timeline-icon" style={{
                  borderColor: item.theme,
                  backgroundColor: item.theme,
                }}/>
                {
                  !isOutput() && !isReadonly() && <div class="xnote-timeline-tools">
                    <Button class="xnote-timeline-add xnote-icon-plus" onClick={() => {
                      const index = component.state.items.indexOf(item) + 1
                      component.state.items.splice(index, 0, createTimelineItem(textbus, item.theme))
                    }}></Button>
                    <Button class="xnote-timeline-add xnote-icon-bin" onClick={() => {
                      const index = component.state.items.indexOf(item)
                      component.state.items.splice(index, 1)
                    }}></Button>
                  </div>
                }
                {
                  adapter.slotRender(item.slot, children => {
                    return createVNode('div', {
                      class: 'xnote-timeline-item-content',
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


export const timelineComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.className === 'xnote-timeline'
  },
  read(element: HTMLElement, context: Textbus, slotParser: SlotParser) {
    return new TimelineComponent(context, {
      items: Array.from(element.children).map(child => {
        const slot = new Slot([
          ContentType.BlockComponent
        ])
        return {
          theme: '',
          slot: slotParser(slot, child.querySelector('div.xnote-timeline-content') || document.createElement('div'))
        }
      })
    })
  }
}

