import { AbstractComponent } from './component';

export interface ComponentControlPanelView {
  title: string;
  view: HTMLElement;
  onDestroy?(): void;
}

export abstract class ComponentSetter<T extends AbstractComponent> {
  abstract create(instance: T): ComponentControlPanelView;
}
