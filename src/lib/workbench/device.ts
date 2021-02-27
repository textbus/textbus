import { forwardRef, Inject, Injectable } from '@tanbo/di';
import { fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { EditorOptions } from '../editor-options';
import { EDITOR_OPTIONS } from '../inject-tokens';
import { EditorController } from '../editor-controller';
import { createElement } from '../uikit/uikit';

export interface DeviceOption {
  label: string;
  value: string;
  default?: boolean;
}

@Injectable()
export class Device {
  elementRef: HTMLElement;

  private options: DeviceOption[];
  private button: HTMLElement;
  private label: HTMLElement;
  private menus: HTMLElement;
  private menuItems: HTMLElement[] = [];
  private subs: Subscription[] = [];

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private deviceOptions: EditorOptions<any>,
              private editorController: EditorController) {

    this.options = deviceOptions.deviceOptions || [];

    this.elementRef = createElement('div', {
      classes: ['textbus-device'],
      children: [
        this.button = createElement('button', {
          attrs: {
            type: 'button',
            title: '切换设备宽度'
          },
          classes: ['textbus-status-bar-btn', 'textbus-device-btn'],
          children: [
            createElement('span', {
              classes: ['textbus-icon-device']
            }),
            this.label = createElement('span')
          ]
        }),
        this.menus = createElement('div', {
          classes: ['textbus-device-menus'],
          children: this.options.map(item => {
            const option = createElement('button', {
              attrs: {
                type: 'button'
              },
              props: {
                innerText: item.label
              },
              classes: ['textbus-device-option'],
              children: [
                createElement('small', {
                  props: {
                    innerText: item.value
                  }
                })
              ]
            });
            this.menuItems.push(option);
            return option
          })
        })
      ]
    })

    let isSelfClick = false;

    this.subs.push(
      fromEvent(this.menus, 'click').subscribe((ev) => {
        const index = this.menuItems.indexOf(ev.target as HTMLElement);
        if (index > -1) {
          this.editorController.viewDeviceType = this.options[index].label;
        }
      }),
      this.editorController.onStateChange.pipe(map(e => {
        return e.deviceType;
      }), distinctUntilChanged()).subscribe(t => {
        this.set(t);
      }),
      this.editorController.onStateChange.pipe(map(e => {
        return e.sourceCodeMode;
      }), distinctUntilChanged()).subscribe(b => {
        this.elementRef.style.display = b ? 'none' : '';
      }),
      fromEvent(document, 'click').subscribe(() => {
        if (!isSelfClick) {
          this.elementRef.classList.remove('textbus-device-expand');
        }
        isSelfClick = false;
      }),
      fromEvent(this.button, 'click').subscribe(() => {
        isSelfClick = true;
        this.elementRef.classList.toggle('textbus-device-expand');
      })
    )
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private set(name: string) {
    let flag = false;
    this.options.forEach((item, index) => {
      if (item.label === name) {
        flag = true;
        this.label.innerText = item.label;
        this.menuItems[index].classList.add('textbus-device-option-active');
      } else {
        this.menuItems[index].classList.remove('textbus-device-option-active');
      }
    })
    if (!flag) {
      this.label.innerText = '未知设备';
    }
  }
}
