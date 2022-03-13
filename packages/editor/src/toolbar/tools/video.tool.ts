import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType } from '@textbus/core'

import { DialogTool, DialogToolConfig } from '../toolkit/dialog-tool'
import { I18n } from '../../i18n'
import { Form, FormHidden, FormSwitch, FormTextField } from '../../uikit/forms/_api'
import { videoComponent, VideoState } from '../../components/video.component'
import { FileUploader } from '../../file-uploader'

export function videoToolConfigFactory(injector: Injector): DialogToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const uploader = injector.get(FileUploader)

  const childI18n = i18n.getContext('plugins.toolbar.videoTool.view')
  const form = new Form({
    title: childI18n.get('title'),
    confirmBtnText: childI18n.get('confirmBtnText'),
    cancelBtnText: childI18n.get('cancelBtnText'),
    items: [
      new FormTextField({
        label: childI18n.get('linkLabel'),
        name: 'src',
        placeholder: childI18n.get('linkInputPlaceholder'),
        canUpload: true,
        uploadType: 'video',
        fileUploader: uploader,
        uploadBtnText: childI18n.get('uploadBtnText'),
        validateFn(value: string): string | false {
          if (!value) {
            return childI18n.get('validateErrorMessage')
          }
          return false
        }
      }),
      new FormHidden({
        name: 'controls',
        value: 'controls'
      }),
      new FormTextField({
        label: childI18n.get('videoWidthLabel'),
        name: 'width',
        placeholder: childI18n.get('videoWidthInputPlaceholder'),
        value: '100%'
      }),
      new FormTextField({
        label: childI18n.get('videoHeightLabel'),
        name: 'height',
        placeholder: childI18n.get('videoHeightInputPlaceholder'),
        value: 'auto'
      }),
      new FormSwitch({
        label: childI18n.get('autoplayLabel'),
        checked: false,
        name: 'autoplay'
      })
    ]
  })
  return {
    iconClasses: ['textbus-icon-video'],
    tooltip: i18n.get('plugins.toolbar.videoTool.tooltip'),
    viewController: form,
    queryState(): QueryState<VideoState> {
      const state = query.queryComponent(videoComponent)
      if (state.state === QueryStateType.Enabled) {
        return {
          state: QueryStateType.Enabled,
          value: state.value!.toJSON().state
        }
      }
      return {
        state: state.state,
        value: null
      }
    },
    useValue(value: VideoState) {
      value
      if (value) {
        const state = query.queryComponent(videoComponent)
        if (state.state === QueryStateType.Enabled) {
          state.value!.methods.mergeProps(value)
        } else {
          commander.insert(videoComponent.createInstance(injector, {
            state: value
          }))
        }
      }
    }
  }
}

export function videoTool() {
  return new DialogTool(videoToolConfigFactory)
}
