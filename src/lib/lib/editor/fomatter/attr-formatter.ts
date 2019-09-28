import { Observable } from 'rxjs';

import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Editor } from '../editor';
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

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void {
    console.log(range, this.attrs)
  }
}
