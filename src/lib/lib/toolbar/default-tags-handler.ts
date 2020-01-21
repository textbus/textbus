import { Observable } from 'rxjs';

import { Handler } from './handlers/help';
import { MatchState, Matcher } from '../matcher/matcher';
import { ChildSlotModel, Commander } from '../commands/commander';
import { EditableOptions, Priority } from './help';
import { AbstractData } from '../parser/abstract-data';
import { Editor } from '../editor';
import { DefaultHook } from './default-hook';
import { VElement } from '../renderer/element';

export class DefaultTagCommander implements Commander {
  recordHistory = false;

  command(): void {
  }

  render(state: MatchState, element?: VElement, abstractData?: AbstractData): ChildSlotModel {
    const el = new VElement(abstractData.tag);
    if (abstractData && abstractData.attrs) {
      abstractData.attrs.forEach((value, key) => {
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
    tags: 'div,h1,h2,h3,h4,h5,h6,p,table,thead,tbody,tfoot,tr,td,th,ul,ol,li,br,pre,code'.split(',')
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
