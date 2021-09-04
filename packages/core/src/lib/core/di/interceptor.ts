import { AbstractComponent } from '../component';
import { Fragment } from '../fragment';

export interface TBClipboard {
  fragment: Fragment
  text: string;
}

export interface ContextMenuAction {
  iconClasses?: string[];
  label: string;
  autoRecordingHistory?: boolean;
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
 * TextBus 组件编辑行为生命周期方法。
 */
export abstract class Interceptor<T extends AbstractComponent> {
  /**
   * 在当前组件下输入功能就绪时调用
   * @param event
   */
  abstract onInputReady?(event: TBEvent<T>): void;

  /**
   * 在当前组件下，用户输入时调用
   * @param event
   */
  abstract onInput?(event: TBEvent<T>): void;

  /**
   * 在当前组件下，选区末闭合且触发删除行为时调用
   * @param event
   */
  abstract onDeleteRange?(event: TBEvent<T>): void;

  /**
   * 在当前组件下，选区闭合且触发删除行为时调用
   * @param event
   */
  abstract onDelete?(event: TBEvent<T>): void;

  /**
   * 在当前组件下，用户敲击回车键时调用
   * @param event
   */
  abstract onEnter?(event: TBEvent<T>): void;

  /**
   * 当在当前组件下，触发粘贴行为时调用
   * @param event
   */
  abstract onPaste?(event: TBEvent<T, TBClipboard>): void;

  /**
   * 在当前组件下，触发上下文菜单时调用，需返回上下文本菜单配置，TextBus 会根据配置生成上下文本菜单。
   * @param instance
   */
  abstract onContextmenu?(instance: T): ContextMenuAction[];

  /**
   * 当 TextBus 销毁时调用
   */
  abstract onDestroy?(): void;
}
