import { Injector } from '@tanbo/di';

import { Contents } from './contents';
import { AbstractComponent } from './component';

export interface TBClipboard {
  contents: Contents
  text: string;
}

export interface ContextMenuAction {
  icon?: HTMLElement;
  label: string;
  disabled?: boolean;
  action(): void;
}

/**
 * TextBus 事件对象。
 */
export class TBEvent<T extends AbstractComponent, U = null> {
  /**
   * 是否已阻止事件冒泡。
   */
  get stopped() {
    return this._stopped;
  }

  private _stopped = false;

  constructor(public instance: T, public data: U = null) {
  }

  /**
   * 调用该方法，可阻止事件向上一级虚拟 DOM 节点传递。
   */
  stopPropagation() {
    this._stopped = true;
  }
}

/**
 * TextBus 生命周期方法。
 */
export interface Interceptor<T extends AbstractComponent> {
  setup(injector: Injector): void;

  onInputReady?(): void;

  onInput?(event: TBEvent<T>): void;

  onDeleteRange?(event: TBEvent<T>): void;

  onDelete?(event: TBEvent<T>): void;

  onEnter?(event: TBEvent<T>): void;

  onPaste?(event: TBEvent<T, TBClipboard>): void;

  onContextmenu?(instance: T): ContextMenuAction[];

  onDestroy?(): void;
}
