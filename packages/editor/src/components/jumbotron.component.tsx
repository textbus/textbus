import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onDestroy,
  Slot, useContext,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { headingComponent } from './heading.component'
import { paragraphComponent } from './paragraph.component'
import { Dialog } from '../dialog'
import { Form } from '../uikit/forms/form'
import { I18n } from '../i18n'
import { FormTextField } from '../uikit/forms/form-text-field'
import { FileUploader } from '../file-uploader'

export interface JumbotronComponentState {
  minHeight: string
  backgroundImage: string
  backgroundSize: string
  backgroundPosition: string
}

export function createJumbotronSlot(injector: Injector) {
  const slot = new Slot([
    ContentType.Text,
    ContentType.InlineComponent,
    ContentType.BlockComponent
  ])
  const h1 = headingComponent.createInstance(injector)
  h1.slots.first!.insert('Hello, world!')
  const p1 = paragraphComponent.createInstance(injector)
  p1.slots.first!.insert('你好，我是 Textbus，一个给你带来全新体验的富文本开发框架。')
  const p2 = paragraphComponent.createInstance(injector)
  p2.slots.first!.insert('现在我们开始吧！')

  slot.insert(h1)
  slot.insert(p1)
  slot.insert(p2)
  return slot
}

export const jumbotronComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'JumbotronComponent',
  setup(initData?: ComponentData<JumbotronComponentState>) {
    const slots = useSlots(initData?.slots || [])
    const injector = useContext()
    const dialog = injector.get(Dialog)
    const i18n = injector.get(I18n)
    const fileUploader = injector.get(FileUploader)
    if (slots.length === 0) {
      slots.push(createJumbotronSlot(injector))
    }
    let state = initData?.state || {
      minHeight: '200px',
      backgroundImage: '',
      backgroundPosition: 'center',
      backgroundSize: 'cover'
    }
    const stateController = useState(state)
    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })
    onDestroy(() => {
      sub.unsubscribe()
    })
    const componentI18n = i18n.getContext('components.jumbotronComponent')
    const childI18n = componentI18n.getContext('setting.form')

    function setting() {
      const form = new Form({
        title: childI18n.get('title'),
        confirmBtnText: childI18n.get('confirmBtnText'),
        cancelBtnText: childI18n.get('cancelBtnText'),
        items: [
          new FormTextField({
            name: 'minHeight',
            value: '200px',
            placeholder: childI18n.get('minHeightInputPlaceholder'),
            label: childI18n.get('minHeightLabel')
          }),
          new FormTextField({
            label: childI18n.get('backgroundImageLabel'),
            name: 'backgroundImage',
            value: state.backgroundImage,
            placeholder: childI18n.get('backgroundImageInputPlaceholder'),
            canUpload: true,
            uploadType: 'image',
            fileUploader,
            uploadBtnText: childI18n.get('uploadBtnText'),
            validateFn(value: string): string | false {
              if (!value) {
                return childI18n.get('validateErrorMessage')
              }
              return false
            }
          })
        ]
      })
      dialog.show(form.elementRef)
      const sub1 = form.onComplete.subscribe(data => {
        stateController.update(draft => {
          Object.assign(draft, data)
        })
        dialog.hide()
        sub1.unsubscribe()
        sub2.unsubscribe()
      })
      const sub2 = form.onCancel.subscribe(() => {
        dialog.hide()
        sub1.unsubscribe()
        sub2.unsubscribe()
      })
    }

    return {
      render(isOutputMode: boolean, slotRender): VElement {
        return (
          <tb-jumbotron style={{
            backgroundImage: state.backgroundImage ? `url("${state.backgroundImage}")` : null,
            backgroundSize: state.backgroundSize || 'cover',
            backgroundPosition: state.backgroundPosition || 'center',
            minHeight: state.minHeight
          }}>
            {
              !isOutputMode &&
              <button type="button" class="tb-jumbotron-setting" onClick={setting}><span class="textbus-icon-setting"></span></button>
            }
            {
              slotRender(slots.get(0)!, () => {
                return <div/>
              })
            }
          </tb-jumbotron>
        )
      }
    }
  }
})

export const jumbotronComponentLoader: ComponentLoader = {
  component: jumbotronComponent,
  resources: {
    styles: [
      `
tb-jumbotron {
  display: block;
  min-height: 200px;
  margin-bottom: 1em;
  background-color: #eee;
  padding: 20px;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
}
`
    ],
    editModeStyles: [
      // eslint-disable-next-line max-len
      '.tb-jumbotron-setting { display:none; border-radius: 4px; font-size: 14px;position: absolute; right: 10px; top: 10px; background: #fff; box-shadow: 1px 2px 3px rgba(0,0,0,.1); color: #333; border: 0; outline: none; cursor: pointer;}.tb-jumbotron-setting:hover{color: #1296db} tb-jumbotron:hover .tb-jumbotron-setting{display:block} '
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-jumbotron'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    const style = element.style
    return jumbotronComponent.createInstance(context, {
      state: {
        backgroundImage: (style.backgroundImage || '').replace(/^url\(['"]?|['"]?\)$/g, ''),
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        minHeight: style.minHeight
      },
      slots: [
        slotParser(new Slot([
          ContentType.BlockComponent,
          ContentType.InlineComponent,
          ContentType.Text
        ]), element.children[0] as HTMLElement || document.createElement('div'))
      ]
    })
  }
}
