import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { Matcher } from '../../matcher/matcher';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
}
