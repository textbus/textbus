import { Injector } from '@tanbo/di';

import { AbstractComponent } from './component';

export interface ComponentPresetPanelView {
  title: string;
  view: HTMLElement;
}

export interface ComponentPreset<T extends AbstractComponent> {

  setup(injector: Injector): void;

  receive(instance: T): ComponentPresetPanelView;
}
