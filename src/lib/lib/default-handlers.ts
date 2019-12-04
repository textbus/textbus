import { Observable } from 'rxjs';

import { Handler } from './toolbar/handlers/help';
import { Matcher } from './matcher/matcher';
import { Commander, ReplaceModel } from './commands/commander';
import { Priority } from './toolbar/help';
import { EditableOptions } from './toolbar/utils/cache-data';

export class DefaultTagCommander implements Commander {
  recordHistory = false;
  constructor(private tagName: string) {
  }

  command(): void {
  }

  render(): ReplaceModel {
    return new ReplaceModel(document.createElement(this.tagName));
  }
}

export class DefaultTagsHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = Priority.Default;
  cacheDataConfig: EditableOptions = {
    tag: true
  };
  constructor(public execCommand: Commander,
              public matcher: Matcher) {
  }
}

export const defaultHandlers: Handler[] = [
  ...'h1,h2,h3,h4,h5,h5,p,table,thead,tbody,tfoot,tr,td,ul,ol,li,br'.split(',').map(tag => {
    return new DefaultTagsHandler(new DefaultTagCommander(tag), new Matcher({
      tags: [tag]
    }));
  })
];
