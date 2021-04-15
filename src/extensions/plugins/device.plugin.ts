import { fromEvent, Subscription } from 'rxjs';
import { Inject, Injectable, InjectionToken } from '@tanbo/di';

import { TBPlugin } from '../../lib/ui/plugin';
import { Layout } from '../../lib/ui/layout';
import { EditorController } from '../../lib/editor-controller';
import { I18n } from '../../lib/i18n';
import { createElement } from '../../lib/ui/_api';

export interface DeviceOption {
  label: string;
  value: string;
  default?: boolean;
}

export const DEVICE_OPTIONS = new InjectionToken<DeviceOption[]>('DEVICE_OPTIONS');

@Injectable()
export class DevicePlugin implements TBPlugin {
  private elementRef: HTMLElement;

  private button: HTMLButtonElement;
  private label: HTMLElement;
  private menus: HTMLElement;
  private menuItems: HTMLElement[] = [];
  private subs: Subscription[] = [];

  constructor(@Inject(DEVICE_OPTIONS) private options: DeviceOption[],
              private editorController: EditorController,
              private i18n: I18n,
              private layout: Layout) {
  }

  setup() {
    this.elementRef = createElement('div', {
      classes: ['textbus-device'],
      children: [
        this.button = createElement('button', {
          attrs: {
            type: 'button',
            title: this.i18n.get('plugins.device.title')
          },
          classes: ['textbus-status-bar-btn', 'textbus-device-btn'],
          children: [
            createElement('span', {
              classes: ['textbus-icon-device']
            }),
            this.label = createElement('span', {
              attrs: {
                style: 'margin-left: 5px'
              }
            })
          ]
        }) as HTMLButtonElement,
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
            if (item.default) {
              this.setTabletWidth(item.value);
            }
            return option
          })
        })
      ]
    })
    let isSelfClick = false;

    this.setDeviceType('PC');

    this.subs.push(
      fromEvent(this.menus, 'click').subscribe((ev) => {
        const index = this.menuItems.indexOf(ev.target as HTMLElement);
        if (index > -1) {
          this.setDeviceType(this.options[index].label)
        }
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
      }),
      this.editorController.onStateChange.subscribe(status => {
        this.button.disabled = status.readonly || status.sourcecodeMode;
      })
    )
    this.layout.bottomBar.appendChild(this.elementRef);
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  setDeviceType(name: string) {
    let flag = false;
    this.options.forEach((item, index) => {
      if (item.label === name) {
        flag = true;
        this.setTabletWidth(item.value);
        this.label.innerText = item.label;
        this.menuItems[index].classList.add('textbus-device-option-active');
      } else {
        this.menuItems[index].classList.remove('textbus-device-option-active');
      }
    })
    if (!flag) {
      this.label.innerText = this.i18n.get('plugins.device.unknownDeviceText');
    }
  }

  private setTabletWidth(width: string) {
    this.layout.scroller.style.padding = (width === '100%' || !width) ? '' : '20px';
    this.layout.pageContainer.style.width = width;
  }
}
