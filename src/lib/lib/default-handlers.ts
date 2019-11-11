import { Handler } from './toolbar/handlers/help';
import { Observable } from 'rxjs';
import { Matcher } from './matcher/matcher';
import { Commander } from './commands/commander';

class DefaultCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(): void {
  }

  render(): HTMLElement {
    return document.createElement(this.tagName);
  }
}

class DefaultHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;

  constructor(public execCommand: Commander,
              public matcher: Matcher) {
  }

  updateStatus(h: boolean): void {
  }
}

export const defaultHandlers: Handler[] = 'h1,h2,h3,h4,h5,h5,p,table,thead,tbody,tfoot,tr,td'.split(',').map(tag => {
  return new DefaultHandler(new DefaultCommander(tag), new Matcher({
    tags: [tag]
  }));
});
