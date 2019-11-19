import { Observable } from 'rxjs';

import { Handler } from './toolbar/handlers/help';
import { FormatState, MatchDescription, Matcher } from './matcher/matcher';
import { Commander, ReplaceModel } from './commands/commander';
import { defaultHandlerPriority, propertyHandlerPriority } from './toolbar/help';

class DefaultTagCommander implements Commander {
  constructor(private tagName: string) {
  }

  command(): void {
  }

  render(): ReplaceModel {
    return new ReplaceModel(document.createElement(this.tagName));
  }
}

class DefaultAttrCommander implements Commander {
  constructor(private name: string) {
  }

  command(): void {
  }

  render(state: FormatState, rawElement?: HTMLElement, matchDesc?: MatchDescription): null {
    if (rawElement && matchDesc && matchDesc.attribute) {
      rawElement.setAttribute(this.name, matchDesc.attribute.value);
    }
    return null;
  }
}

class DefaultTagsHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = propertyHandlerPriority;

  constructor(public execCommand: Commander,
              public matcher: Matcher) {
  }

  updateStatus(h: boolean): void {
  }
}

class DefaultAttrsHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = defaultHandlerPriority;

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
  }),
  ...'href,target,title,colspan,rowspan'.split(',').map(key => {
    return new DefaultAttrsHandler(new DefaultAttrCommander(key), new Matcher({
      attrs: [{
        key
      }]
    }))
  })
];
