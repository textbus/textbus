import { Injector } from '@tanbo/di'
import { Commander, QueryState, QueryStateType } from '@textbus/core'

import { DropdownTool, DropdownToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { imageComponent } from '../../components/image.component'
import { Form, FormButton, FormTextField } from '../../uikit/_api'
import { FileUploader } from '../../file-uploader'

export function imageToolConfigFactory(injector: Injector): DropdownToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  const fileUploader = injector.get(FileUploader)
  const childI18n = i18n.getContext('plugins.toolbar.imageTool.view')
  const form = new Form({
    mini: true,
    confirmBtnText: childI18n.get('confirmBtnText'),
    items: [
      new FormTextField({
        label: childI18n.get('linkLabel'),
        name: 'src',
        placeholder: childI18n.get('linkInputPlaceholder')
      }),
      new FormButton({
        name: '',
        value: '',
        label: childI18n.get('uploadLabel'),
        btnText: childI18n.get('uploadBtnText'),
        iconClasses: ['textbus-icon-upload'],
        onClick() {
          fileUploader.upload({
            multiple: true,
            uploadType: 'image',
            currentValue: ''
          }).subscribe(value => {
            if (typeof value === 'string') {
              value = [value]
            }
            value.forEach(i => {
              commander.insert(imageComponent.createInstance(injector, {
                state: {
                  src: i
                }
              }))
            })
          })
        }
      })
    ]
  })
  return {
    iconClasses: ['textbus-icon-image'],
    tooltip: i18n.get('plugins.toolbar.imageTool.tooltip'),
    queryState(): QueryState<any> {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    viewController: form,
    useValue(value: any) {
      if (!value) {
        return
      }
      commander.insert(imageComponent.createInstance(injector, {
        state: {
          src: value.src
        }
      }))
    }
  }
}

export function imageTool() {
  return new DropdownTool(imageToolConfigFactory)
}
