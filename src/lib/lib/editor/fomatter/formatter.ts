import { MatchStatus } from '../../matcher';
import { TBRange } from '../../range';
import { Editor } from '../editor';

export interface Formatter {
  format(range: TBRange, editor: Editor, matchStatus: MatchStatus): void;
}
