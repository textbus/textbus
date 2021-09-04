import { Observable, Subject } from 'rxjs';

import { EmojiCommander } from '../commands/emoji.commander';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { DropdownViewer } from '../toolkit/dropdown-tool';

class Emoji implements DropdownViewer {
  elementRef = document.createElement('div');
  onComplete: Observable<string>;

  private checkEvent = new Subject<string>();

  constructor() {
    this.onComplete = this.checkEvent.asObservable();
    this.elementRef.classList.add('textbus-toolbar-emoji-menu');
    const emoji: string[] = [];
    for (let i = 0x1F600; i <= 0x1F64F; i++) {
      emoji.push(i.toString(16).toUpperCase());
    }
    const fragment = document.createDocumentFragment();
    const buttons = emoji.map(s => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('textbus-toolbar-emoji-menu-item');
      button.innerHTML = `&#x${s};`;
      fragment.appendChild(button);
      return button;
    });
    this.elementRef.addEventListener('click', (ev: MouseEvent) => {
      const target = ev.target;
      for (const btn of buttons) {
        if (target === btn) {
          this.checkEvent.next(btn.innerHTML);
          break;
        }
      }
    });
    this.elementRef.appendChild(fragment);
  }

  update(): void {
    //
  }
}

export const emojiToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-emoji'],
  tooltip: i18n => i18n.get('plugins.toolbar.emojiTool.tooltip'),
  commanderFactory() {
    return new EmojiCommander()
  },
  viewFactory() {
    return new Emoji();
  },
};
export const emojiTool = new DropdownTool(emojiToolConfig);
