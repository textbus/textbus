import { Observable } from 'rxjs';

import { Handler } from './toolbar/handlers/help';
import { FormatState, Matcher } from './matcher/matcher';
import { ChildSlotModel, Commander } from './commands/commander';
import { Priority } from './toolbar/help';
import { AbstractData, EditableOptions } from './toolbar/utils/abstract-data';
import { Editor } from './editor';
import { DefaultHook } from './default-hook';
import { VElement } from './renderer/element';

export class DefaultTagCommander implements Commander {
  recordHistory = false;

  command(): void {
  }

  render(state: FormatState, element?: VElement, cacheData?: AbstractData): ChildSlotModel {
    const el = new VElement(cacheData.tag);
    if (cacheData && cacheData.attrs) {
      cacheData.attrs.forEach((value, key) => {
        if (value !== null) {
          el.attrs.set(key, value);
        }
      })
    }
    return new ChildSlotModel(el);
  }
}

export class DefaultTagsHandler implements Handler {
  elementRef: HTMLElement;
  onApply: Observable<void>;
  priority = Priority.Default;
  context: Editor;
  hook = new DefaultHook();
  matcher = new Matcher({
    tags: 'div,h1,h2,h3,h4,h5,h6,p,table,thead,tbody,tfoot,tr,td,th,ul,ol,li,br'.split(',')
  });

  editableOptions(el: HTMLElement): EditableOptions {
    if (/td|th/i.test(el.tagName)) {
      return {
        tag: true,
        attrs: ['rowspan', 'colspan']
      }
    }
    return {
      tag: true
    }
  }

  execCommand = new DefaultTagCommander();
}
