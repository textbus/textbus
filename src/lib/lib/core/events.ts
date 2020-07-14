import { Subject } from 'rxjs';
import { TBSelection } from './selection';
import { Renderer } from './renderer';

/**
 * 虚拟 DOM 节点上支持的事件类型。
 */
export enum EventType {
  onFocus = 'focus',
  onEnter = 'enter',
  onDelete = 'delete',
  onInput = 'input',
  onPaste = 'paste',
  onRendered = 'rendered'
}

/**
 * 实例化事件时，所需要参数。
 */
export interface EventParams {
  type: EventType;
  selection: TBSelection;
  renderer: Renderer;
  data?: {[key: string]: any};
}

/**
 * TBus 事件对象。
 */
export class TBEvent {
  /**
   * 是否已阻止事件冒泡。
   */
  get stopped() {
    return this._stopped;
  }

  readonly type: EventType;
  readonly selection: TBSelection;
  readonly renderer: Renderer;
  readonly data: {[key: string]: any};

  private _stopped = false;

  constructor(config: EventParams) {
    this.type = config.type;
    this.selection = config.selection;
    this.renderer = config.renderer;
    this.data = config.data;
  }

  /**
   * 调用该方法，可阻止事件向上一级虚拟 DOM 节点传递。
   */
  stopPropagation() {
    this._stopped = true;
  }
}

/**
 * TBus 事件发射器。
 */
export class EventEmitter extends Subject<TBEvent> {
  emit(value: TBEvent) {
    super.next(value);
  }
}
