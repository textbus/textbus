import { Observable } from 'rxjs';

import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Frame } from '../frame';
import { MatchStatus } from '../../matcher';
import { AttrState } from '../../formats/forms/help';

export class AttrFormatter implements Formatter {
  private attrs: AttrState[] = [];

  constructor(private tagName: string, attrs: AttrState[] | Observable<AttrState[]>) {
    if (attrs instanceof Observable) {
      attrs.subscribe(r => {
        this.attrs = r;
      })
    } else {
      this.attrs = attrs;
    }
  }

  format(range: TBRange, frame: Frame, matchStatus: MatchStatus): void {
    function setAttr(el: HTMLElement, attr: AttrState) {
      const isBooleanValue = typeof attr.value === 'boolean';
      let value = attr.value;
      if (isBooleanValue) {
        if (attr.value) {
          value = attr.name;
        } else {
          return;
        }
      }
      el.setAttribute(attr.name, value + '');
    }

    if (matchStatus.inContainer) {
      this.attrs.forEach(item => {
        setAttr(matchStatus.container as HTMLElement, item);
      });
    } else {
      const container = document.createElement(this.tagName);
      this.attrs.forEach(item => {
        setAttr(container, item);
      });
      range.rawRange.surroundContents(container);
    }
  }
}
