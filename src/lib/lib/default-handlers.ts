import { Observable } from 'rxjs';

import { Handler } from './toolbar/handlers/help';
import { Matcher } from './matcher/matcher';
import { Commander, ReplaceModel } from './commands/commander';
import { CacheDataConfig, defaultHandlerPriority } from './toolbar/help';

class DefaultTagCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(): void {
  }

  render(): ReplaceModel {
    return new ReplaceModel(document.createElement(this.tagName));
  }
}

class DefaultTagsHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = defaultHandlerPriority;
  cacheDataConfig: CacheDataConfig;
  constructor(public execCommand: Commander,
              public matcher: Matcher) {
  }

  updateStatus(h: boolean): void {
  }
}

export const defaultHandlers: Handler[] = [
  ...'h1,h2,h3,h4,h5,h5,p,table,thead,tbody,tfoot,tr,td,ul,ol,li'.split(',').map(tag => {
    return new DefaultTagsHandler(new DefaultTagCommander(tag), new Matcher({
      tags: [tag]
    }));
  })
];
