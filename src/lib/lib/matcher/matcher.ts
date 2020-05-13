import { Template } from '../core/template';
import { Formatter } from '../core/formatter';
import { TBSelection } from '../viewer/selection';

export type MatchRule = Formatter | { new(): Template };

export class Matcher {
  queryState(selection: TBSelection, rule: MatchRule) {
    console.log(rule, selection);
  }
}
