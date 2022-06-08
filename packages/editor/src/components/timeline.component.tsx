import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  Slot,
  SlotRender,
  useContext,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'

import { blockComponent } from './block.component'
import { colorFormatter, fontSizeFormatter } from '../formatters/inline-style.formatter'
import { boldFormatter } from '../formatters/inline-tag.formatter'
import { paragraphComponent } from './paragraph.component'

const timelineTypes = ['primary', 'info', 'success', 'warning', 'danger', 'dark', 'gray']
const colors = ['#1296db', '#6ad1ec', '#15bd9a', '#ff9900', '#E74F5E', '#495060', '#bbbec4']

export type TimelineType = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'dark' | 'gray';

export interface TimelineSlotState {
  type: TimelineType
}

export function createTimelineItem(injector: Injector, type: TimelineType = 'primary') {
  const slot = new Slot<TimelineSlotState>([
    ContentType.BlockComponent,
    ContentType.Text,
    ContentType.InlineComponent
  ], {
    type
  })

  const title = blockComponent.createInstance(injector)
  title.slots.first!.insert('时间主题', [
    [fontSizeFormatter, '18px'],
    [boldFormatter, true]
  ])
  title.slots.first!.insert(' 2020-02-02', [
    [fontSizeFormatter, '15px'],
    [colorFormatter, '#777']
  ])

  const desc = paragraphComponent.createInstance(injector)
  desc.slots.first!.insert('描述信息...')
  slot.insert(title)
  slot.insert(desc)
  return slot
}

export const timelineComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TimelineComponent',
  setup(initData?: ComponentData<void, TimelineSlotState>) {
    const injector = useContext()
    const slots = useSlots<TimelineSlotState>(initData?.slots || [
      createTimelineItem(injector)
    ])

    if (slots.length === 0) {
      slots.push(createTimelineItem(injector))
    }
    return {
      render(isOutput: boolean, slotRender: SlotRender): VElement {
        return (
          <tb-timeline>
            {
              slots.toArray().map(slot => {
                const type = slot.state!.type
                const classes = ['tb-timeline-item']
                if (type) {
                  classes.push('tb-timeline-item-' + type)
                }
                return (
                  <div class={classes.join(' ')}>
                    <div class="tb-timeline-line"/>
                    <div class="tb-timeline-icon" title={isOutput ? null : '点击切换颜色'} onClick={() => {
                      if (!type) {
                        slot.updateState(draft => {
                          draft.type = timelineTypes[0] as TimelineType
                        })
                      } else {
                        slot.updateState(draft => {
                          draft.type = timelineTypes[timelineTypes.indexOf(type) + 1] as TimelineType || null
                        })
                      }
                    }}/>
                    {
                      !isOutput && <span class="tb-timeline-add" onClick={() => {
                        const index = slots.indexOf(slot) + 1
                        slots.insertByIndex(createTimelineItem(injector, type), index)
                      }}/>
                    }
                    {
                      slotRender(slot, () => {
                        return <div class="tb-timeline-content"/>
                      })
                    }
                  </div>
                )
              })
            }
          </tb-timeline>
        )
      }
    }
  }
})

export const timelineComponentLoader: ComponentLoader = {
  component: timelineComponent,
  resources: {
    styles: [
      `
tb-timeline {
  display: block;
  padding-top: 1em;
  padding-left: 5px;
}
.tb-timeline-item {
  display: block;
  position: relative;
  padding-left: 1.5em;
  padding-bottom: 0.5em;
  opacity: .76;
}

.tb-timeline-item:first-of-type > .tb-timeline-line{
  top: 1em;
}

.tb-timeline-item:last-of-type > .tb-timeline-line{
  bottom: calc(100% - 1em);
}

.tb-timeline-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px solid #dddee1;
}

.tb-timeline-icon {
  box-sizing: border-box;
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  left: -4px;
  top: .5em;
  background-color: #fff;
  border: 1px solid #bbbec4;
}

` + colors.map((value, index) => {
        return `
  .tb-timeline-item-${timelineTypes[index]} {
    opacity: 1;
  }
  .tb-timeline-item-${timelineTypes[index]} >.tb-timeline-icon {
    border-color: ${value};
    background-color: ${value};
  }
  .tb-timeline-item-${timelineTypes[index]} >.tb-timeline-line {
    border-color: ${value};
  }
  `
      }).join('\n')
    ],
    editModeStyles: [
      `
.tb-timeline-icon:hover {
  transform: scale(1.2);
  cursor: pointer;
}
.tb-timeline-add {
  display: none;
  position: absolute;
  right: 0;
  top: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.tb-timeline-add:before {
  content: "+";
}
.tb-timeline-add:hover {
  transform: scale(1.2);
}

.tb-timeline-item:hover .tb-timeline-add {
  display: block;
}
.tb-timeline-content {
  overflow: hidden;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-timeline'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    return timelineComponent.createInstance(context, {
      slots: Array.from(element.children).map(child => {
        let type: TimelineType = 'primary'
        for (const k of timelineTypes) {
          if (child.classList.contains('tb-timeline-item-' + k)) {
            type = k as TimelineType
            break
          }
        }
        const slot = new Slot<TimelineSlotState>([
          ContentType.InlineComponent,
          ContentType.Text,
          ContentType.BlockComponent
        ], {
          type
        })
        return slotParser(slot, child.querySelector('div.tb-timeline-content') || document.createElement('div'))
      })
    })
  }
}
