import {
  ComponentInitData, ComponentInstance,
  ContentType,
  defineComponent, onContextMenu,
  onDestroy,
  Slot, useContext,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { Injector } from '@tanbo/di'
import { I18n } from '../i18n'

export interface AlertComponentState {
  type: string
  fill: boolean
}

export const alertComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'AlertComponent',
  setup(initData?: ComponentInitData<AlertComponentState>) {
    const slots = useSlots(initData?.slots || [])
    let state = initData?.state || {
      type: 'primary',
      fill: false
    }
    const stateController = useState(state)
    const injector = useContext()
    const i18n = injector.get(I18n)

    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })
    onDestroy(() => {
      sub.unsubscribe()
    })
    if (slots.length === 0) {
      slots.push(new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ]))
    }

    const childI18n = i18n.getContext('components.alertComponent.contextMenu')

    onContextMenu(ev => {
      ev.useMenus([{
        label: state.fill ? childI18n.get('noFill') : childI18n.get('fill'),
        onClick() {
          stateController.update(draft => {
            draft.fill = !state.fill
          })
        }
      }, {
        label: childI18n.get('type'),
        submenu: 'default,primary,info,success,warning,danger,dark,gray'.split(',').map(i => {
          return {
            label: i,
            onClick() {
              stateController.update(draft => {
                draft.type = i
              })
            }
          }
        })
      }])
    })

    return {
      render(slotRender): VElement {
        const classes = ['tb-alert']
        if (state.fill) {
          classes.push('tb-alert-fill')
        }
        if (state.type) {
          classes.push('tb-alert-' + state.type)
        }
        return (
          <tb-alert data-type={state.type} class={classes.join(' ')}>
            {
              slotRender(slots.get(0)!, children => {
                return <div>{children}</div>
              })
            }
          </tb-alert>
        )
      }
    }
  }
})

export const alertComponentLoader: ComponentLoader = {
  match(element: HTMLElement): boolean {
    return element.tagName.toLowerCase() === 'tb-alert'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    return alertComponent.createInstance(context, {
      state: {
        fill: element.classList.contains('tb-alert-fill'),
        type: element.dataset.type || ''
      },
      slots: [
        slotParser(new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ]), element.children[0] as HTMLElement || document.createElement('div'))
      ]
    })
  }
}
