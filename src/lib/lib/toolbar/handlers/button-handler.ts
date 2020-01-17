import { Observable, Subject } from 'rxjs';

import { ButtonConfig } from '../help';
import { createKeymapHTML, Handler } from './help';
import { CommonMatchDelta, Matcher, MatchState } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { EditableOptions } from '../utils/abstract-data';
import { Hook } from '../../viewer/help';
import { Keymap } from '../../viewer/events';

export class ButtonHandler implements Handler {
  readonly elementRef = document.createElement('button');
  matcher: Matcher;
  onApply: Observable<void>;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook: Hook;
  keymap: Keymap;
  private eventSource = new Subject<void>();

  constructor(private config: ButtonConfig) {
    this.priority = config.priority;
    this.editableOptions = config.editable;
    this.hook = config.hook;

    this.matcher = (config.match instanceof Matcher) ? config.match : new Matcher(config.match);
    this.execCommand = config.execCommand;
    this.onApply = this.eventSource.asObservable();
    this.elementRef.type = 'button';
    this.elementRef.title = config.tooltip || '';
    this.elementRef.classList.add('tanbo-editor-handler');
    const inner = document.createElement('span');
    inner.innerText = config.label || '';
    inner.classList.add(...(config.classes || []));
    this.elementRef.appendChild(inner);
    if (config.keymap) {
      this.keymap = {
        config: config.keymap,
        action: () => {
          if (!this.elementRef.disabled) {
            this.eventSource.next();
          }
        }
      };
      const keymapLabel = document.createElement('span');
      keymapLabel.classList.add('tanbo-editor-handler-keymap');
      keymapLabel.innerHTML = createKeymapHTML(config.keymap);
      this.elementRef.appendChild(keymapLabel);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next();
    });
  }

  updateStatus(commonMatchDelta: CommonMatchDelta): void {
    switch (commonMatchDelta.state) {
      case MatchState.Highlight:
        this.elementRef.disabled = false;
        this.elementRef.classList.add('tanbo-editor-handler-active');
        break;
      case MatchState.Normal:
        this.elementRef.disabled = false;
        this.elementRef.classList.remove('tanbo-editor-handler-active');
        break;
      case MatchState.Disabled:
        this.elementRef.classList.remove('tanbo-editor-handler-active');
        this.elementRef.disabled = true;
        break
    }
  }
}
