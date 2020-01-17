import { fromEvent, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { isMac } from './tools';

export interface KeymapConfig {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  key: string | string[];
}

export interface Keymap {
  config: KeymapConfig;

  action(event: Event): any;
}

export class Events {
  onInput: Observable<Event>;
  onFocus: Observable<Event>;
  onBlur: Observable<Event>;
  onPaste: Observable<Event>;
  onCopy: Observable<Event>;
  onCut: Observable<Event>;

  private keymaps: Keymap[] = [];

  constructor(private input: HTMLInputElement | HTMLTextAreaElement) {
    this.setup();
  }

  addKeymap(keymap: Keymap) {
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
      const keymaps = this.keymaps.filter(key => {
        if (Array.isArray(key.config.key)) {
          return key.config.key.includes(ev.key);
        }
        return key.config.key === ev.key;
      });
      for (const item of keymaps) {
        if (!!item.config.altKey === ev.altKey &&
          !!item.config.shiftKey === ev.shiftKey &&
          !!item.config.ctrlKey === (isMac ? ev.metaKey : ev.ctrlKey)
        ) {
          ev.preventDefault();
          return item.action(ev);
        }
      }
    });
  }
}
