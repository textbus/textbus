import { Injector } from '@tanbo/di';
import { Commander } from './commander';

export interface TBPlugin {
  setup(injector: Injector): void;

  onApplyCommand?(command: Commander,
                 params: any,
                 updateParamsFn: (newParams: any) => void): void;
  /**
   * 当选区发生变化时调用。
   */
  onSelectionChange?(): void;

  /**
   * 当视图更新前调用
   */
  onRenderingBefore?(): void;

  /**
   * 当视图更新后调用。
   */
  onViewUpdated?(): void;

  onDestroy?(): void
}
