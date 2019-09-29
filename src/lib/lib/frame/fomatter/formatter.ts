import { MatchStatus } from '../../matcher';
import { TBRange } from '../../range';
import { Frame } from '../frame';

export interface Formatter {
  format(range: TBRange, frame: Frame, matchStatus: MatchStatus): void;
}
