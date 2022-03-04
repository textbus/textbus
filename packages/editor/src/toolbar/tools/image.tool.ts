import { Injector } from '@tanbo/di'
import { Commander, Query, QueryState, QueryStateType } from '@textbus/core'
import { createElement, createTextNode } from '@textbus/browser'

import { DialogTool, DialogToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { AttrState, Form, FormItem, FormRadio, FormTextField } from '../../uikit/_api'
import { imageComponent } from '../../components/image.component'
import { FileUploader } from '../../file-uploader'

class MarginSetter implements FormItem<string> {
  name = 'margin'
  elementRef: HTMLElement

  private inputs: HTMLInputElement[] = []

  constructor(label: string) {
    this.elementRef = createElement('div', {
      classes: ['textbus-form-group'],
      children: [
        createElement('label', {
          classes: ['textbus-control-label'],
          children: [
            createTextNode(label)
          ]
        }),
        createElement('div', {
          classes: ['textbus-control-static'],
          children: [
            createElement('div', {
              classes: ['textbus-toolbar-image-margin-setter'],
              children: Array.from({length: 4}).fill(null).map(() => createElement('input', {
                attrs: {
                  type: 'text',
                  value: '0'
                },
                classes: ['textbus-form-control']
              }))
            })
          ]
        })
      ]
    })
    this.inputs = Array.from(this.elementRef.querySelectorAll('input'))
  }

  reset() {
    this.inputs.forEach(input => input.value = '')
  }

  update(value?: any): void {
    this.reset()
    if (value) {
      const vars = (value + '').split(/\s+/g)
      vars.forEach((v, index) => {
        this.inputs[index].value = v
      })
    }
  }

  getAttr(): AttrState<string> {
    return {
      name: this.name,
      value: this.inputs.map(input => {
        if (Number(input.value)) {
          return input.value + 'px'
        }
        return input.value || '0'
      }).join(' ')
    }
  }

  validate() {
    return true
  }
}

interface Size {
  width?: string;
  height?: string;
}

class SizeSetter implements FormItem {
  elementRef: HTMLElement

  private inputs: HTMLInputElement[] = []

  constructor(public name: string,
              private i18n: I18n) {
    this.elementRef = createElement('div', {
      classes: ['textbus-form-group'],
      children: [
        createElement('label', {
          classes: ['textbus-control-label'],
          children: [
            createTextNode(i18n.get('label'))
          ]
        }),
        createElement('div', {
          classes: ['textbus-control-value'],
          children: [
            createElement('div', {
              classes: ['textbus-toolbar-image-size-setter'],
              children: [
                createElement('input', {
                  attrs: {type: 'text', placeholder: i18n.get('widthPlaceholder')},
                  classes: ['textbus-form-control']
                }),
                createTextNode(' * '),
                createElement('input', {
                  attrs: {type: 'text', placeholder: i18n.get('heightPlaceholder')},
                  classes: ['textbus-form-control']
                })
              ]
            })
          ]
        })
      ]
    })
    this.inputs = Array.from(this.elementRef.querySelectorAll('input'))
  }

  reset() {
    this.inputs.forEach(input => input.value = '')
  }

  update(value?: Size) {
    this.inputs[0].value = value?.width || ''
    this.inputs[1].value = value?.height || ''
  }

  getAttr(): AttrState<Size> {
    return {
      name: this.name,
      value: {
        width: this.inputs[0].value,
        height: this.inputs[1].value
      }
    }
  }

  validate(): boolean {
    return true
  }
}

export function imageToolConfigFactory(injector: Injector): DialogToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  const fileUploader = injector.get(FileUploader)

  const childI18n = i18n.getContext('plugins.toolbar.imageTool.view')
  const form = new Form({
    title: childI18n.get('title'),
    maxHeight: '260px',
    cancelBtnText: childI18n.get('cancelBtnText'),
    confirmBtnText: childI18n.get('confirmBtnText'),
    items: [
      new FormTextField({
        label: childI18n.get('linkLabel'),
        name: 'src',
        placeholder: childI18n.get('linkInputPlaceholder'),
        canUpload: true,
        uploadType: 'image',
        uploadBtnText: childI18n.get('uploadBtnText'),
        uploadMultiple: true,
        fileUploader,
        validateFn(value: string) {
          if (!value) {
            return childI18n.get('validateErrorMessage')
          }
          return false
        }
      }),
      new SizeSetter('size', childI18n.getContext('sizeSetter')),
      new SizeSetter('maxSize', childI18n.getContext('maxSizeSetter')),
      new FormRadio({
        label: childI18n.get('float.label'),
        name: 'float',
        values: [{
          label: childI18n.get('float.noFloatLabel'),
          value: 'none',
          default: true
        }, {
          label: childI18n.get('float.floatToLeftLabel'),
          value: 'left'
        }, {
          label: childI18n.get('float.floatToRightLabel'),
          value: 'right'
        }]
      }),
      new MarginSetter(childI18n.get('marginLabel'))
    ]
  })
  return {
    iconClasses: ['textbus-icon-image'],
    tooltip: i18n.get('plugins.toolbar.imageTool.tooltip'),
    viewController: form,
    queryState(): QueryState<any> {
      const state = query.queryWrappedComponent(imageComponent)
      const value = state.value?.toJSON().state
      return {
        state: state.state,
        value: value ? {
          src: value.src,
          margin: value.margin,
          float: value.float,
          size: {
            width: value.width,
            height: value.height
          },
          maxSize: {
            width: value.maxWidth,
            height: value.maxHeight
          }
        } : null
      }
    },
    useValue(value: any) {
      if (value) {
        value = {
          src: value.src,
          margin: value.margin,
          float: value.float,
          maxWidth: value.maxSize.width,
          maxHeight: value.maxSize.height,
          width: value.size.width,
          height: value.size.height
        }
      }
      const state = query.queryWrappedComponent(imageComponent)
      if (state.state === QueryStateType.Enabled) {
        state.value!.updateState(draft => {
          Object.assign(draft, value)
        })
      } else if (value?.src) {
        commander.insert(imageComponent.createInstance(injector, {
          state: value
        }))
      }
    }
  }
}

export function imageTool() {
  return new DialogTool(imageToolConfigFactory)
}
