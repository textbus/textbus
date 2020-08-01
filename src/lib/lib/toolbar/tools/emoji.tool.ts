import { Observable, Subject } from 'rxjs';

import { DropdownViewer } from '../toolkit/utils/dropdown';
import { EmojiCommander } from '../commands/emoji.commander';
import { Toolkit } from '../toolkit/toolkit';

class Emoji implements DropdownViewer {
  elementRef = document.createElement('div');
  onComplete: Observable<string>;

  private checkEvent = new Subject<string>();

  constructor() {
    this.onComplete = this.checkEvent.asObservable();
    this.elementRef.classList.add('tbus-emoji-menu');
    const emoji: string[] = [];
    for (let i = 0x1F600; i <= 0x1F64F; i++) {
      emoji.push(i.toString(16).toUpperCase());
    }
    const fragment = document.createDocumentFragment();
    const buttons = emoji.map(s => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('tbus-emoji-menu-item');
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
  }
}

export const emojiTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-emoji'],
  tooltip: '表情',
  commanderFactory() {
    return new EmojiCommander()
  },
  menuFactory() {
    return new Emoji();
  },
  supportSourceCodeModel: true
});
