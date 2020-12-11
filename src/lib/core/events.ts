import { AbstractComponent } from '@tanbo/textbus/lib/core/component';

/**
 * TextBus 事件对象。
 */
export class TBEvent<T extends AbstractComponent, U = any> {
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
