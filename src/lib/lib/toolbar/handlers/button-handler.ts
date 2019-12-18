import { Observable, Subject } from 'rxjs';

import { ButtonConfig, Hook } from '../help';
import { Handler } from './help';
import { CommonMatchDelta, Matcher, MatchState } from '../../matcher/matcher';
import { Commander } from '../../commands/commander';
import { EditableOptions } from '../utils/cache-data';

export class ButtonHandler implements Handler {
  readonly elementRef = document.createElement('button');
  matcher: Matcher;
  onApply: Observable<void>;
  execCommand: Commander;
  priority: number;
  cacheDataConfig: EditableOptions;
  hook: Hook;
  private eventSource = new Subject<void>();

  constructor(private config: ButtonConfig) {
    this.priority = config.priority;
    this.cacheDataConfig = config.editable;
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
