import { Observable } from 'rxjs';

import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { Editor } from '../editor';
import { MatchStatus } from '../../matcher';
import { AttrState } from '../../formats/common/help';

export class AttrFormatter implements Formatter {
  constructor(private tagName: string, attr: AttrState[] | Observable<AttrState[]>) {
  }

  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void {
  }
}
