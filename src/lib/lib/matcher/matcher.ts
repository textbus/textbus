import { Template } from '../core/template';
import { Formatter } from '../core/formatter';
import { TBSelection } from '../viewer/selection';

export class FormatMatcher {
  constructor(private rule: Formatter) {
  }

  queryState(selection: TBSelection) {
    return false;
  };
}

export abstract class TemplateMatcher {
  abstract queryState(selection: TBSelection, template: Template): boolean;
}

export type Matcher = FormatMatcher | TemplateMatcher;
