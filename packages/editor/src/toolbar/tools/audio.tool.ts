import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType } from '@textbus/core'

import { DialogTool, DialogToolConfig } from '../toolkit/dialog-tool'
import { I18n } from '../../i18n'
import { Form, FormHidden, FormSwitch, FormTextField } from '../../uikit/forms/_api'
import { audioComponent, AudioState } from '../../components/audio.component'
import { FileUploader } from '../../file-uploader'

export function audioToolConfigFactory(injector: Injector): DialogToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const uploader = injector.get(FileUploader)

  const childI18n = i18n.getContext('plugins.toolbar.audioTool.view')

  const form = new Form({
    title: childI18n.get('title'),
    cancelBtnText: childI18n.get('cancelBtnText'),
    confirmBtnText: childI18n.get('confirmBtnText'),
    items: [
      new FormTextField({
        label: childI18n.get('addressLabel'),
        name: 'src',
        placeholder: childI18n.get('addressPlaceholder'),
        canUpload: true,
        uploadType: 'audio',
        uploadBtnText: childI18n.get('uploadBtnText'),
        fileUploader: uploader,
        validateFn(value: string): string | false {
          if (!value) {
            return childI18n.get('errorMessage')
          }
          return false
        }
      }),
      new FormSwitch({
        label: childI18n.get('switchLabel'),
        checked: false,
        name: 'autoplay'
      }),
      new FormHidden({
        name: 'controls',
        value: 'controls'
      })
    ]
  })
  return {
    iconClasses: ['textbus-icon-music'],
    tooltip: i18n.get('plugins.toolbar.audioTool.tooltip'),
    viewController: form,
    queryState(): QueryState<AudioState> {
      const state = query.queryComponent(audioComponent)
      if (state.state === QueryStateType.Enabled) {
        return {
          state: QueryStateType.Enabled,
          value: state.value!.extends.toJSON() as AudioState
        }
      }
      return {
        state: state.state,
        value: null
      }
    },
    useValue(value: AudioState) {
      if (value) {
        const state = query.queryComponent(audioComponent)
        if (state.state === QueryStateType.Enabled) {
          state.value!.extends.mergeProps(value)
        } else {
          commander.insert(audioComponent.createInstance(injector, {
            state: value
          }))
        }
      }
    }
  }
}

export function audioTool() {
  return new DialogTool(audioToolConfigFactory)
}
