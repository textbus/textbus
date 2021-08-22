import { I18n, createElement, createTextNode } from '@textbus/core';
import { ImageComponent, PreComponent } from '@textbus/components';
import { AttrState, Form, FormItem, FormRadio, FormTextField } from '@textbus/uikit';

import { LeafComponentMatcher } from '../matcher/leaf-component.matcher';
import { ImageCommander } from '../commands/image.commander';
import { FormTool, FormToolConfig } from '../toolkit/_api';

class MarginSetter implements FormItem<string> {
  name = 'margin';
  elementRef: HTMLElement;

  private inputs: HTMLInputElement[] = [];

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
    });
    this.inputs = Array.from(this.elementRef.querySelectorAll('input'));
  }

  reset() {
    this.inputs.forEach(input => input.value = '');
  }

  update(value?: any): void {
    this.reset();
    if (value) {
      const vars = (value + '').split(/\s+/g);
      vars.forEach((v, index) => {
        this.inputs[index].value = v;
      });
    }
  }

  getAttr(): AttrState<string> {
    return {
      name: this.name,
      value: this.inputs.map(input => {
        if (Number(input.value)) {
          return input.value + 'px';
        }
        return input.value || '0'
      }).join(' ')
    }
  }

  validate() {
    return true;
  }
}

interface Size {
  width?: string;
  height?: string;
}

class SizeSetter implements FormItem {
  elementRef: HTMLElement;

  private inputs: HTMLInputElement[] = [];

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
    });
    this.inputs = Array.from(this.elementRef.querySelectorAll('input'));
  }

  reset() {
    this.inputs.forEach(input => input.value = '');
  }

  update(value?: Size) {
    this.inputs[0].value = value?.width || '';
    this.inputs[1].value = value?.height || '';
  }

  getAttr(): AttrState<Size> {
    return {
      name: this.name,
      value: {
        width: this.inputs[0].value,
        height: this.inputs[1].value
      }
    };
  }

  validate(): boolean {
    return true;
  }
}

export const imageToolConfig: FormToolConfig = {
  iconClasses: ['textbus-icon-image'],
  tooltip: i18n => i18n.get('plugins.toolbar.imageTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.imageTool.view');
    return new Form({
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
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('validateErrorMessage');
            }
            return null;
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
  },
  matcher: new LeafComponentMatcher(ImageComponent, 'img', [PreComponent]),
  commanderFactory() {
    return new ImageCommander();
  }
};
export const imageTool = new FormTool(imageToolConfig);
