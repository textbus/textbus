import { Observable, Subject } from 'rxjs';

import { DropdownHandlerView } from '../toolkit/utils/dropdown';
import { EmojiCommander } from '../commands/emoji.commander';
import { Toolkit } from '../toolkit/toolkit';

class Emoji implements DropdownHandlerView {
  elementRef = document.createElement('div');
  onCheck: Observable<string>;

  private checkEvent = new Subject<string>();

  constructor() {
    this.onCheck = this.checkEvent.asObservable();
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

const viewer = new Emoji();
const commander = new EmojiCommander();

viewer.onCheck.subscribe(t => {
  commander.updateValue(t);
});

export const emojiTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-emoji'],
  execCommand: commander,
  viewer,
  onHide: viewer.onCheck,
});
