import { Contents } from './contents';
import { AbstractComponent } from './component';

export interface TBClipboard {
  contents: Contents
  text: string;
}

export interface ContextMenuAction {
  iconClasses?: string[];
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
export abstract class Interceptor<T extends AbstractComponent> {
  abstract onInputReady?(event: TBEvent<T>): void;

  abstract onInput?(event: TBEvent<T>): void;

  abstract onDeleteRange?(event: TBEvent<T>): void;

  abstract onDelete?(event: TBEvent<T>): void;

  abstract onEnter?(event: TBEvent<T>): void;

  abstract onPaste?(event: TBEvent<T, TBClipboard>): void;

  abstract onContextmenu?(instance: T): ContextMenuAction[];

  abstract onDestroy?(): void;
}
