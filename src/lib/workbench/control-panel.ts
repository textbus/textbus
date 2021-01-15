import { Injectable } from '@tanbo/di';
import { createElement } from '../uikit/_api';

export interface ControlPanelView {
  title: string;
  view: HTMLElement;
}

@Injectable()
export class ControlPanel {
  elementRef: HTMLElement;
  constructor() {
    this.elementRef = createElement('div', {
      classes: ['textbus-control-panel']
    })
  }

  addPanel(view: ControlPanelView) {
    console.log(view)
  }
}
