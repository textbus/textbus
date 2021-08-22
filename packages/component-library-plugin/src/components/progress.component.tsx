import { Component, ComponentLoader, LeafAbstractComponent, VElement, ViewData, UIDialog } from '@textbus/core';
import { Form, FormTextField, FormSelect } from '@textbus/uikit';
import { ComponentCreator } from '../component-library.plugin';

export interface ProgressConfig {
  type: 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'gray' | 'dark';
  progress: number;
  max: number;
  min: number;
}

class ProgressComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-progress';
  }

  read(element: HTMLElement): ViewData {
    const component = new ProgressComponent({
      type: element.getAttribute('type') as any,
      progress: +element.getAttribute('progress') || 0,
      max: +element.getAttribute('max') || 100,
      min: +element.getAttribute('min') || 0
    });
    return {
      slotsMap: [],
      component
    };
  }
}

const colors = {
  primary: '#1296db',
  info: '#6ad1ec',
  success: '#15bd9a',
  warning: '#ff9900',
  danger: '#E74F5E',
  dark: '#495060',
  gray: '#bbbec4'
}

@Component({
  loader: new ProgressComponentLoader(),
  styles: [
    `
tb-progress {
  margin: 2em 0 1em;
  background-color: #eee;
  border-radius: 3px;
  height: 6px;
  display: block;
  position: relative;
}
tb-progress > div {
  height: 100%;
  border-radius: inherit;
  background-color: #aaa;
  position: relative;
}
tb-progress > span {
  position: absolute;
  bottom: 100%;
  font-size:12px;
}
.tb-progress-value {
  position: absolute;
  right: 0;
  bottom: 100%;
  background-color: #000;
  color: #fff;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 13px;
  transform: translateX(50%) translateY(-4px);
}
.tb-progress-value:after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -4px;
  width: 0;
  height: 0;
  border-width: 4px;
  border-style: solid;
  border-color: #000 transparent transparent;
}
.tb-progress-min {
  left: 0;
}
.tb-progress-max {
  right: 0;
}
tb-progress[type=primary] > div {
  background-color: ${colors.primary}
}
tb-progress[type=info] > div {
  background-color: ${colors.info}
}
tb-progress[type=success] > div {
  background-color: ${colors.success}
}
tb-progress[type=warning] > div {
  background-color: ${colors.warning}
}
tb-progress[type=danger] > div {
  background-color: ${colors.danger}
}
tb-progress[type=dark] > div {
  background-color: ${colors.dark}
}
tb-progress[type=gray] > div {
  background-color: ${colors.gray}
}
`
  ]
})
export class ProgressComponent extends LeafAbstractComponent {
  block = true;

  constructor(private config: ProgressConfig) {
    super('tb-progress');
  }

  clone(): ProgressComponent {
    return new ProgressComponent({
      ...this.config
    });
  }

  render(): VElement {
    const config = this.config;
    const value = Math.round((config.progress - config.min) / (config.max - config.min) * 100) + '%';
    return (
      <tb-progress {...config}>
        <span class="tb-progress-min">{config.min}</span>
        <div style={{width: value}}>
          <span class="tb-progress-value">{value}</span>
        </div>
        <span class="tb-progress-max">{config.max}</span>
      </tb-progress>
    )
  }
}

export const progressComponentExample: ComponentCreator = {
  name: i18n => i18n.get('components.progressComponent.creator.name'),
  category: 'TextBus',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#fff" height="100%" width="100%"/></g><line x1="10" y1="40" x2="90" y2="40" stroke="#ddd" stroke-width="4" stroke-linecap="round"></line><line x1="10" y1="40" x2="50" y2="40" stroke="#1296db" stroke-width="4" stroke-linecap="round"></line><text font-family="Helvetica, Arial, sans-serif" font-size="10" x="42" y="35" stroke-width="0" stroke="#000" fill="#000000">50%</text></svg>')}">`,
  factory(dialog: UIDialog, _, i18n) {
    const childI18n = i18n.getContext('components.progressComponent.creator.form');
    const form = new Form({
      title: childI18n.get('title'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      cancelBtnText: childI18n.get('cancelBtnText'),
      items: [
        new FormTextField({
          label: childI18n.get('max.label'),
          name: 'max',
          value: '100',
          placeholder: childI18n.get('max.placeholder'),
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('max.validateErrorMessage');
            }
            return null;
          }
        }),
        new FormTextField({
          label: childI18n.get('min.label'),
          name: 'min',
          value: '0',
          placeholder: childI18n.get('min.placeholder'),
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('min.validateErrorMessage');
            }
            return null;
          }
        }),
        new FormTextField({
          label: childI18n.get('progress.label'),
          name: 'progress',
          value: '50',
          placeholder: childI18n.get('progress.placeholder'),
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('progress.validateErrorMessage');
            }
            return null;
          }
        }),
        new FormSelect({
          label: childI18n.get('type.label'),
          name: 'type',
          options: [{
            label: 'Primary',
            value: 'primary'
          }, {
            label: 'Info',
            value: 'info'
          }, {
            label: 'Success',
            value: 'success'
          }, {
            label: 'Warning',
            value: 'warning'
          }, {
            label: 'Danger',
            value: 'danger'
          }, {
            label: 'Dark',
            value: 'dark'
          }, {
            label: 'Gray',
            value: 'gray'
          }],
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('type.validateErrorMessage');
            }
            return null;
          }
        })
      ]
    })

    return new Promise<ProgressComponent>((resolve) => {
      dialog.dialog(form.elementRef);
      const s = form.onComplete.subscribe(data => {
        s.unsubscribe();
        const component = new ProgressComponent({
          type: data.get('type') as any,
          max: +data.get('max'),
          min: +data.get('min'),
          progress: +data.get('progress')
        });

        dialog.close();
        resolve(component);
      });
      const b = form.onClose.subscribe(() => {
        s.unsubscribe();
        b.unsubscribe();
        dialog.close();
      });
    })
  }
};
