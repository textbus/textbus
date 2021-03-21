import { Injector } from '@tanbo/di';

export interface TextBusUI {
  setup(rootInjector: Injector): void;

  onReady?(injector: Injector): void;

  onDestroy?(): void;
}
