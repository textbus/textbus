import { AbstractComponent } from '../component';

/**
 * 快捷键配置项
 */
export interface Keymap {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
}

/**
 * 添加快捷键配置的参数
 */
export interface KeymapAction {
  /** 快捷键配置 */
  keymap: Keymap;

  /** 当触发快捷键时执行的回调 */
  action(event: Event): any;
}

export abstract class DynamicKeymap<T extends AbstractComponent> {
  abstract provide(instance: T): KeymapAction[];
}
