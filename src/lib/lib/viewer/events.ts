import { fromEvent, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface KeyMapConfig {
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  key: string | string[];
}

export interface KeyMap {
  config: KeyMapConfig;

  action(event: Event): any;
}

export class Events {
  onInput: Observable<Event>;
  onFocus: Observable<Event>;
  onBlur: Observable<Event>;
  onPaste: Observable<Event>;

  private keyMaps: KeyMap[] = [];

  constructor(private input: HTMLInputElement | HTMLTextAreaElement) {
    this.setup();
  }

  addKeyMap(keyMap: KeyMap) {
    this.keyMaps.push(keyMap);
  }

  private setup() {
    this.onInput = fromEvent(this.input, 'input');
    this.onFocus = fromEvent(this.input, 'focus');
    this.onBlur = fromEvent(this.input, 'blur');
    this.onPaste = fromEvent(this.input, 'paste');

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
      const keyMaps = this.keyMaps.filter(key => {
        if (Array.isArray(key.config.key)) {
          return key.config.key.includes(ev.key);
        }
        return key.config.key === ev.key;
      });
      for (const item of keyMaps) {
        if (!!item.config.altKey === ev.altKey &&
          !!item.config.ctrlKey === ev.ctrlKey &&
          !!item.config.shiftKey === ev.shiftKey &&
          !!item.config.metaKey === ev.metaKey) {
          return item.action(ev);
        }
      }
    });
  }
}
