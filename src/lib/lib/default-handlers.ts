import { Observable } from 'rxjs';

import { Handler } from './toolbar/handlers/help';
import { FormatState, Matcher } from './matcher/matcher';
import { Commander, ReplaceModel } from './commands/commander';
import { Priority } from './toolbar/help';
import { CacheData, EditableOptions } from './toolbar/utils/cache-data';

export class DefaultTagCommander implements Commander {
  recordHistory = false;

  constructor(private tagName: string) {
  }

  command(): void {
  }

  render(state: FormatState, element?: HTMLElement, cacheData?: CacheData): ReplaceModel {
    const el = document.createElement(this.tagName);
    if (cacheData && cacheData.attrs) {
      cacheData.attrs.forEach((value, key) => {
        if (value !== null) {
          el.setAttribute(key, value);
        }
      })
    }
    return new ReplaceModel(el);
  }
}

export class DefaultTagsHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = Priority.Default;

  constructor(public execCommand: Commander,
              public matcher: Matcher,
              public cacheDataConfig: EditableOptions = {tag: true}) {
  }
}

export const defaultHandlersMap = new Map<string, Handler>();


export const defaultHandlers: Handler[] = [
  ...'h1,h2,h3,h4,h5,h6,p,table,thead,tbody,tfoot,tr,ul,ol,li,br'.split(',').map(tag => {
    const h = new DefaultTagsHandler(new DefaultTagCommander(tag), new Matcher({
      tags: [tag]
    }));
    defaultHandlersMap.set(tag, h);
    return h;
  }),
  ...'th,td'.split(',').map(tag => {
    const h =  new DefaultTagsHandler(new DefaultTagCommander(tag), new Matcher({
      tags: [tag]
    }), {
      tag: true,
      attrs: ['rowspan', 'colspan']
    });
    defaultHandlersMap.set(tag, h);
    return h;
  })
];
