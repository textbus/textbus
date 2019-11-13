import { Observable } from 'rxjs';

import { Handler } from './toolbar/handlers/help';
import { Matcher, FormatState } from './matcher/matcher';
import { Commander, ReplaceModel } from './commands/commander';
import { defaultHandlerPriority } from './toolbar/help';

class DefaultCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(): void {
  }

  render(): ReplaceModel {
    return new ReplaceModel(document.createElement(this.tagName));
  }
}

class DefaultHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = defaultHandlerPriority;
  constructor(public execCommand: Commander,
              public matcher: Matcher) {
  }

  updateStatus(h: boolean): void {
  }
}

export const defaultHandlers: Handler[] = 'h1,h2,h3,h4,h5,h5,p,table,thead,tbody,tfoot,tr,td,ul,ol,li'.split(',').map(tag => {
  return new DefaultHandler(new DefaultCommander(tag), new Matcher({
    tags: [tag]
  }));
});
