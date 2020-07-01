import { Observable, Subject } from 'rxjs';

export class Device {
  elementRef = document.createElement('div');
  onChange: Observable<string>;

  private options = [{
    label: 'PC',
    value: '100%',
  }, {
    label: 'iPhone5/SE',
    value: '320px'
  }, {
    label: 'iPhone6/7/8/X',
    value: '375px'
  }, {
    label: 'iPhone6/7/8 Plus',
    value: '414px'
  }, {
    label: 'iPad',
    value: '768px'
  }, {
    label: 'iPad Pro',
    value: '1024px'
  }];
  private button = document.createElement('button');
  private label = document.createElement('span');
  private menus = document.createElement('div');
  private menuItems: HTMLElement[] = [];

  private changeEvent = new Subject<string>();

  constructor() {
    this.onChange = this.changeEvent.asObservable();
    this.button.type = 'button';
    this.options.forEach(item => {
      const option = document.createElement('button');
      option.type = 'button';
      option.classList.add('tbus-device-option');
      option.innerText = item.label;
      const sm = document.createElement('small');
      sm.innerText = item.value;
      option.appendChild(sm);
      this.menuItems.push(option);
      this.menus.appendChild(option);
    });
    this.button.classList.add('tbus-icon-device', 'tbus-device-btn');
    this.button.appendChild(this.label);
    this.elementRef.classList.add('tbus-device');
    this.menus.classList.add('tbus-device-menus');
    this.elementRef.appendChild(this.button);
    this.elementRef.appendChild(this.menus);
    this.menus.addEventListener('click', ev => {
      const index = this.menuItems.indexOf(ev.target as HTMLElement);
      if (index > -1) {
        const value = this.options[index].value;
        this.update(value);
        this.changeEvent.next(value);
      }
    })
    let isSelfClick = false;
    document.addEventListener('click', () => {
      if (!isSelfClick) {
        this.elementRef.classList.remove('tbus-device-expand');
      }
      isSelfClick = false;
    });
    this.button.addEventListener('click', () => {
      isSelfClick = true;
      this.elementRef.classList.toggle('tbus-device-expand');
    });
  }

  update(value: string) {
    let flag = false;
    this.options.forEach((item, index) => {
      if (item.value === value) {
        flag = true;
        this.label.innerText = item.label;
        this.menuItems[index].classList.add('tbus-device-option-active');
      } else {
        this.menuItems[index].classList.remove('tbus-device-option-active');
      }
    })
    if (!flag) {
      this.label.innerText = '未知设备';
    }
  }
}
