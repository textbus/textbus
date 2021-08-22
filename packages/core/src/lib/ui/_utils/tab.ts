import { createElement, createTextNode } from './_api';

export interface TabConfig {
  label: string;
  view: HTMLElement;
}

export class Tab {
  elementRef: HTMLElement;
  head: HTMLElement;
  private btnWrapper: HTMLElement;
  private viewContainer: HTMLElement;

  constructor() {
    this.elementRef = createElement('div', {
      classes: ['textbus-tab'],
      children: [
        this.head = createElement('div', {
          classes: ['textbus-tab-head'],
          children: [
            this.btnWrapper = createElement('div', {
              classes: ['textbus-tab-btn-wrapper']
            })
          ]
        }),
        this.viewContainer = createElement('div', {
          classes: ['textbus-tab-view']
        })
      ]
    })
  }

  show(config: TabConfig[]) {
    this.btnWrapper.innerHTML = '';
    this.viewContainer.innerHTML = '';
    const btns = config.map((item, index) => {
      const btn = createElement('button', {
        classes: ['textbus-tab-btn'],
        children: [
          createTextNode(item.label)
        ]
      })
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('textbus-tab-btn-active'));
        btn.classList.add('textbus-tab-btn-active');
        this.viewContainer.innerHTML = '';
        this.viewContainer.appendChild(item.view);
      })

      this.btnWrapper.appendChild(btn);
      if (index === 0) {
        btn.classList.add('textbus-tab-btn-active');
        this.viewContainer.appendChild(item.view)
      }
      return btn;
    })
  }
}
