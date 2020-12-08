import { forwardRef, Inject, Injectable } from '@tanbo/di';
import { Editor } from '../editor';
import { EditorController } from '../editor-controller';

export interface DeviceOption {
  label: string;
  value: string;
  default?: boolean;
}

@Injectable()
export class Device {
  elementRef = document.createElement('div');

  private options: DeviceOption[];
  private button = document.createElement('button');
  private label = document.createElement('span');
  private menus = document.createElement('div');
  private menuItems: HTMLElement[] = [];

  constructor(@Inject(forwardRef(() => Editor)) private editor: Editor,
              private editorController: EditorController) {

    this.options = editor.options.deviceOptions || [];

    this.button.type = 'button';
    this.button.title = '切换设备宽度';
    this.options.forEach(item => {
      const option = document.createElement('button');
      option.type = 'button';
      option.classList.add('textbus-device-option');
      option.innerText = item.label;
      const sm = document.createElement('small');
      sm.innerText = item.value;
      option.appendChild(sm);
      this.menuItems.push(option);
      this.menus.appendChild(option);
    });
    this.button.classList.add('textbus-icon-device', 'textbus-device-btn');
    this.button.appendChild(this.label);
    this.elementRef.classList.add('textbus-device');
    this.menus.classList.add('textbus-device-menus');
    this.elementRef.appendChild(this.button);
    this.elementRef.appendChild(this.menus);
    this.menus.addEventListener('click', ev => {
      const index = this.menuItems.indexOf(ev.target as HTMLElement);
      if (index > -1) {
        this.editorController.viewDeviceType = this.options[index].value;
      }
    })
    this.editorController.onStateChange.subscribe(status => {
      this.set(status.deviceType);
    })
    let isSelfClick = false;
    document.addEventListener('click', () => {
      if (!isSelfClick) {
        this.elementRef.classList.remove('textbus-device-expand');
      }
      isSelfClick = false;
    });
    this.button.addEventListener('click', () => {
      isSelfClick = true;
      this.elementRef.classList.toggle('textbus-device-expand');
    });
  }

  set(name: string) {
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
