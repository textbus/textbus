import { Injector } from '@tanbo/di';

import { AbstractComponent } from './component';

export interface ComponentControlPanelView {
  title: string;
  view: HTMLElement;
}

export interface ComponentSetter<T extends AbstractComponent> {

  setup(injector: Injector): void;

  create(instance: T): ComponentControlPanelView;
}
