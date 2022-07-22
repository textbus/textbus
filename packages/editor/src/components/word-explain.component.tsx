import {
  Commander,
  ComponentData, ComponentInstance,
  ContentType,
  defineComponent, onContextMenu,
  onDestroy,
  onSlotRemove,
  Slot,
  SlotRender,
  useContext,
  useSelf,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { I18n } from '../i18n'
import { Form, FormTextField } from '../uikit/forms/_api'
import { Dialog } from '../dialog'

export interface WordExplainComponentState {
  width: string
}

export const wordExplainComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'WordExplainComponent',
  separable: false,
  setup(initData?: ComponentData<WordExplainComponentState>) {
    const slots = useSlots(initData?.slots || [])
    let state = initData?.state || {
      width: '140px'
    }

    while (slots.length < 3) {
      slots.push(new Slot([ContentType.Text, ContentType.InlineComponent]))
    }

    const stateController = useState<WordExplainComponentState>(state)

    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })
    const injector = useContext()
    const commander = injector.get(Commander)
    const i18n = injector.get(I18n)
    const dialog = injector.get(Dialog)
    const self = useSelf()

    onDestroy(() => {
      sub.unsubscribe()
    })

    onSlotRemove(ev => {
      ev.preventDefault()
    })

    const childI18n = i18n.getContext('components.wordExplainComponent.setter')

    function setting() {
      const form = new Form({
        title: childI18n.get('title'),
        confirmBtnText: childI18n.get('confirmBtnText'),
        cancelBtnText: childI18n.get('cancelBtnText'),
        items: [
          new FormTextField({
            name: 'width',
            value: state.width,
            placeholder: childI18n.get('widthInputPlaceholder'),
            label: childI18n.get('widthLabel')
          })
        ]
      })

      dialog.show(form.elementRef)

      const sub = form.onComplete.subscribe(data => {
        stateController.update(draft => {
          draft.width = data.width
        })
        dialog.hide()
        sub.unsubscribe()
      })
      sub.add(form.onCancel.subscribe(() => {
        dialog.hide()
        sub.unsubscribe()
      }))
    }

    onContextMenu(event => {
      event.useMenus([{
        label: childI18n.get('title'),
        onClick() {
          setting()
        }
      }])
    })

    return {
      render(isOutputMode: boolean, slotRenderFn: SlotRender): VElement {
        return (
          <tb-word-explain>
            <div class="tb-word-explain-title-group" style={{ width: state.width }}>
              {slotRenderFn(slots.get(0)!, () => {
                return <div class="tb-word-explain-title"/>
              })}
              {slotRenderFn(slots.get(1)!, () => {
                return <div class="tb-word-explain-subtitle"/>
              })}
            </div>
            {slotRenderFn(slots.get(2)!, () => {
              return <div class="tb-word-explain-detail"/>
            })}
            {
              !isOutputMode && <span class="tb-word-explain-close" onClick={() => {
                commander.removeComponent(self)
              }
              }/>
            }
          </tb-word-explain>
        )
      }
    }
  }
})

export const wordExplainComponentLoader: ComponentLoader = {
  component: wordExplainComponent,
  resources: {
    styles: [
      `
tb-word-explain {
  display: flex;
  margin-top: 1em;
  margin-bottom: 1em;
  padding: 10px 20px;
  background-color: #f8f8f9;
  border-radius: 10px;
}

.tb-word-explain-title-group {
  width: 140px;
  padding-right: 20px;
}
.tb-word-explain-title {
  margin:0;
  font-size: inherit;
}
.tb-word-explain-subtitle {
  margin: 0;
  font-weight: 300;
  font-size: 0.9em;
}
.tb-word-explain-detail {
  flex: 1;
  padding-left: 20px;
  border-left: 1px solid #ddd;
}
@media screen and (max-width: 767px) {
  tb-word-explain {
    display: block;
  }
  .tb-word-explain-title-group {
    width: auto !important;
    padding-right: 0;
    display: flex;
    align-items: baseline;
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
  }
  .tb-word-explain-subtitle {
    margin-left: 0.5em;
    font-weight: 300;
    font-size: 0.9em;
  }
  .tb-word-explain-detail {
    padding-left: 0;
    border-left: none;
  }
}
`
    ],
    editModeStyles: [
      `
tb-word-explain {
  position: relative;
}
tb-word-explain:hover .tb-word-explain-close {
  display: block;
}
.tb-word-explain-close {
  display: none;
  position: absolute;
  right: 10px;
  top: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.tb-word-explain-close:hover {
  transform: scale(1.2);
}
.tb-word-explain-close:before {
  content: "\u00d7";
}
`
    ]
  },
  match(element: Element): boolean {
    return element.nodeName.toLowerCase() === 'tb-word-explain'
  },

  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    const title = element.querySelector('.tb-word-explain-title') as HTMLElement
    const subtitle = element.querySelector('.tb-word-explain-subtitle') as HTMLElement
    const detail = element.querySelector('.tb-word-explain-detail') as HTMLElement

    const { Text, InlineComponent } = ContentType
    const titleSlot = new Slot([Text, InlineComponent])
    const subtitleSlot = new Slot([Text, InlineComponent])
    const detailSlot = new Slot([Text, InlineComponent])
    const width = (element.querySelector('.tb-word-explain-title-group') as HTMLElement).style.width

    slotParser(titleSlot, title)
    slotParser(subtitleSlot, subtitle)
    slotParser(detailSlot, detail)

    return wordExplainComponent.createInstance(context, {
      state: {
        width
      },
      slots: [
        titleSlot,
        subtitleSlot,
        detailSlot
      ]
    })
  }
}
