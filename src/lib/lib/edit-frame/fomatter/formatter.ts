import { MatchStatus } from '../../matcher';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';

export interface Formatter {
  recordHistory: boolean;

  format(range: TBRange, frame: EditFrame, matchStatus: MatchStatus): void;
}
