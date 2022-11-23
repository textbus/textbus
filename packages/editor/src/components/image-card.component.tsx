import {
  Commander,
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onDestroy,
  onBreak,
  Selection,
  Slot,
  useContext,
  useSelf,
  useSlots,
  useState,
  VElement
} from '@textbus/core'
import { ComponentLoader, SlotParser } from '@textbus/platform-browser'
import { Injector } from '@tanbo/di'
import { Dialog } from '../dialog'
import { Form, FormTextField } from '../uikit/forms/_api'
import { FileUploader } from '../file-uploader'
import { I18n } from '../i18n'
import { paragraphComponent } from './paragraph.component'

export interface ImageCardComponentState {
  src: string
  height: string
}

// eslint-disable-next-line max-len
const svg = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#555" height="100%" width="100%"/></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="24" y="50%" x="50%" text-anchor="middle" dominant-baseline="middle" stroke-width="0" stroke="#000" fill="#000000">Image</text></g></svg>'
const defaultImageSrc = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
export const imageCardComponent = defineComponent({
  type: ContentType.BlockComponent,
  separable: false,
  name: 'ImageCardComponent',
  setup(initData?: ComponentInitData<ImageCardComponentState>) {
    let state = initData?.state || {
      src: defaultImageSrc,
      height: '200px'
    }
    const stateController = useState(state)
    const injector = useContext()
    const dialog = injector.get(Dialog)
    const commander = injector.get(Commander)
    const selection = injector.get(Selection)
    const i18n = injector.get(I18n)
    const fileUploader = injector.get(FileUploader)
    const slots = useSlots(initData?.slots || [])

    if (slots.length === 0) {
      const slot = new Slot([
        ContentType.Text
      ])
      slot.insert('图片名称')
      slots.push(slot)
    }

    const sub = stateController.onChange.subscribe(newState => {
      state = newState
    })

    onDestroy(() => {
      sub.unsubscribe()
    })

    const self = useSelf()
    onBreak(ev => {
      const slot = ev.target.cutTo(new Slot([
        ContentType.InlineComponent,
        ContentType.Text
      ]), ev.data.index)
      const component = paragraphComponent.createInstance(injector, {
        slots: [slot]
      })
      commander.insertAfter(component, self)
      ev.preventDefault()
      selection.selectFirstPosition(component)
    })

    const childI18n = i18n.getContext('components.imageCardComponent.setting')

    function showForm() {
      const form = new Form({
        title: childI18n.get('title'),
        confirmBtnText: childI18n.get('confirmBtnText'),
        cancelBtnText: childI18n.get('cancelBtnText'),
        items: [
          new FormTextField({
            label: childI18n.get('srcLabel'),
            uploadType: 'image',
            canUpload: true,
            value: state.src,
            name: 'src',
            placeholder: childI18n.get('srcPlaceholder'),
            fileUploader
          }),
          new FormTextField({
            label: childI18n.get('heightLabel'),
            name: 'height',
            value: state.height,
            placeholder: childI18n.get('heightPlaceholder')
          })
        ]
      })
      dialog.show(form.elementRef)

      form.onComplete.subscribe((values) => {
        stateController.update(draft => {
          Object.assign(draft, values)
        })
        dialog.hide()
      })
      form.onCancel.subscribe(() => {
        dialog.hide()
      })
    }

    return {
      render(slotRender): VElement {
        return (
          <tb-image-card data-src={state.src} data-height={state.height}>
            <div onClick={showForm}>
              <img src={state.src} style={{
                height: state.height
              }}/>
            </div>
            {
              slotRender(slots.get(0)!, children => {
                return <p>{children}</p>
              })
            }
          </tb-image-card>
        )
      }
    }
  }
})

export const imageCardComponentLoader: ComponentLoader = {
  resources: {
    styles: [
      `
tb-image-card {
  display: block;
  margin-top: 10px;
  margin-bottom: 20px;
  box-shadow: 1px 2px 3px rgba(0, 0, 0, .1);
  border-radius: 3px;
  overflow: hidden;
}
tb-image-card > div > img {
  width: 100%;
  display: block;
  min-height: 40px;
}
tb-image-card > p {
  margin: 0;
  text-align: center;
  font-size: 15px;
  color: #aaa;
  height: 24px;
  line-height: 24px;
  padding: 6px 20px;
  box-sizing: content-box;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-image-card'
  },
  read(element: HTMLElement, context: Injector, slotParser: SlotParser): ComponentInstance {
    const p = element.querySelector('p')
    const slot = new Slot([ContentType.Text])
    return imageCardComponent.createInstance(context, {
      state: {
        height: element.dataset.height!,
        src: element.dataset.src!
      },
      slots: [
        p ? slotParser(slot, p) : slot
      ]
    })
  }
}
