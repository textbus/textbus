import { fromEvent, Subscription } from 'rxjs';

import { createElement } from '../uikit/uikit';
import { TextBusUI } from '../ui';

export interface DeviceOption {
  label: string;
  value: string;
  default?: boolean;
}

export class Device implements TextBusUI {
  private elementRef: HTMLElement;

  private button: HTMLElement;
  private label: HTMLElement;
  private menus: HTMLElement;
  private menuItems: HTMLElement[] = [];
  private subs: Subscription[] = [];

  constructor(private options: DeviceOption[]) {
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
  }

  setup() {
    let isSelfClick = false;

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
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
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
