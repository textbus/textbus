import { AbstractComponent } from './component';

export interface ComponentControlPanelView {
  title: string;
  view: HTMLElement;
  onDestroy?(): void;
}

/**
 * TextBus 组件控制页面生成器
 */
export abstract class ComponentSetter<T extends AbstractComponent> {
  /**
   * 生成页面的方法
   * @param instance
   */
  abstract create(instance: T): ComponentControlPanelView;

  /**
   * TextBus 销毁时调用
   */
  abstract onDestroy?(): void;
}
