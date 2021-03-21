import { Injector } from '@tanbo/di';

export interface TextBusUI {
  setup(): void;

  onReady?(injector: Injector): void;

  onDestroy?(): void;
}
