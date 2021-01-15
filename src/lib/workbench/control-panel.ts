import { Injectable } from '@tanbo/di';
import { createElement } from '../uikit/_api';
import { ComponentPresetPanelView } from '../core/component-preset';

@Injectable()
export class ControlPanel {
  elementRef: HTMLElement;

  private container: HTMLElement;
  private titleGroup: HTMLElement;
  private viewWrapper: HTMLElement;

  constructor() {
    this.elementRef = createElement('div', {
      classes: ['textbus-control-panel'],
      children: [
        this.container = createElement('div', {
          classes: ['textbus-control-panel-container'],
          children: [
            this.titleGroup = createElement('div', {
              classes: ['textbus-control-panel-tab']
            }),
            this.viewWrapper = createElement('div', {
              classes: ['textbus-control-panel-view']
            })
          ]
        })
      ]
    })
  }

  showPanels(views: ComponentPresetPanelView[]) {
    this.titleGroup.innerHTML = '';
    this.viewWrapper.innerHTML = '';
    if (views.length === 0) {
      this.elementRef.classList.remove('textbus-control-panel-show')
      return
    }
    this.elementRef.classList.add('textbus-control-panel-show')
    const btns: HTMLElement[] = views.map(view => {
      const btn = createElement('button', {
        classes: ['textbus-control-panel-tab-btn'],
        attrs: {
          type: 'button'
        },
        props: {
          innerText: view.title
        }
      });
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('textbus-control-panel-tab-btn-active'));
        btn.classList.add('textbus-control-panel-tab-btn-active');
        this.viewWrapper.innerHTML = '';
        this.viewWrapper.appendChild(view.view);
      })
      this.titleGroup.appendChild(btn);
      return btn;
    })
    this.viewWrapper.appendChild(views[0].view);

    btns[0].classList.add('textbus-control-panel-tab-btn-active');
  }
}
