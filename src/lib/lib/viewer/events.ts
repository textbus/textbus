import { fromEvent, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { isMac } from './tools';

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

/**
 * 事件劫持类，用于分配用户鼠标和键盘操作后的逻辑
 */
export class Events {
  onInput: Observable<Event>;
  onFocus: Observable<Event>;
  onBlur: Observable<Event>;
  onPaste: Observable<Event>;
  onCopy: Observable<Event>;
  onCut: Observable<Event>;

  private keymaps: KeymapAction[] = [];

  constructor(private input: HTMLInputElement | HTMLTextAreaElement) {
    this.setup();
  }

  /**
   * 添加快捷键
   * @param keymap
   */
  addKeymap(keymap: KeymapAction) {
    this.keymaps.push(keymap);
  }

  private setup() {
    this.onInput = fromEvent(this.input, 'input');
    this.onFocus = fromEvent(this.input, 'focus');
    this.onBlur = fromEvent(this.input, 'blur');
    this.onPaste = fromEvent(this.input, 'paste');
    this.onCopy = fromEvent(this.input, 'copy');
    this.onCut = fromEvent(this.input, 'cut');

    let isWriting = false;
    fromEvent(this.input, 'compositionstart').subscribe(() => {
      isWriting = true;
    });

    fromEvent(this.input, 'compositionend').subscribe(() => {
      isWriting = false;
    });
    fromEvent(this.input, 'keydown').pipe(filter(() => {
      // 处理输入法中间状态时，按回车或其它键时，不需要触发事件
      return !isWriting || !this.input.value;
    })).subscribe((ev: KeyboardEvent) => {
      const keymaps = this.keymaps.filter(keyMap => {
        if (Array.isArray(keyMap.keymap.key)) {
          return new RegExp(`^(${keyMap.keymap.key.join('|')})$`, 'i').test(ev.key);
        }
        return new RegExp(`^${ev.key}$`, 'i').test(keyMap.keymap.key);
      });

      for (const item of keymaps) {
        if (!!item.keymap.altKey === ev.altKey &&
          !!item.keymap.shiftKey === ev.shiftKey &&
          !!item.keymap.ctrlKey === (isMac ? ev.metaKey : ev.ctrlKey)
        ) {
          ev.preventDefault();
          return item.action(ev);
        }
      }
    });
  }
}
