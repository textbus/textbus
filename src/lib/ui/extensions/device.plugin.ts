import { fromEvent, Subscription } from 'rxjs';
import { Inject, Injectable, InjectionToken } from '@tanbo/di';

import { createElement } from '../uikit/uikit';
import { TBPlugin } from '../plugin';
import { Layout } from '../layout';

export interface DeviceOption {
  label: string;
  value: string;
  default?: boolean;
}

export const DEVICE_OPTIONS = new InjectionToken<DeviceOption[]>('DEVICE_OPTIONS');

@Injectable()
export class DevicePlugin implements TBPlugin {
  private elementRef: HTMLElement;

  private button: HTMLElement;
  private label: HTMLElement;
  private menus: HTMLElement;
  private menuItems: HTMLElement[] = [];
  private subs: Subscription[] = [];

  constructor(@Inject(DEVICE_OPTIONS) private options: DeviceOption[],
              private layout: Layout) {
  }

  setup() {
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
            this.label = createElement('span', {
              attrs: {
                style: 'margin-left: 5px'
              }
            })
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
            if (item.default) {
              this.setTabletWidth(item.value);
            }
            return option
          })
        })
      ]
    })
    let isSelfClick = false;

    this.set('PC');

    this.subs.push(
      fromEvent(this.menus, 'click').subscribe((ev) => {
        const index = this.menuItems.indexOf(ev.target as HTMLElement);
        if (index > -1) {
          this.set(this.options[index].label)
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
      })
    )
    this.layout.bottom.appendChild(this.elementRef);
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private set(name: string) {
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
      this.label.innerText = '未知设备';
    }
  }

  private setTabletWidth(width: string) {
    if (width === '100%') {
      this.layout.scroller.style.padding = '';
      // this.layout.docer.setMinHeight(this.editableArea.offsetHeight);
    } else {
      this.layout.scroller.style.padding = '20px';
      // this.viewer.setMinHeight(this.editableArea.offsetHeight - 40);
    }
    this.layout.wrapper.style.width = width;
  }
}
