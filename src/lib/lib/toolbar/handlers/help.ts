import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { Matcher } from '../../matcher/matcher';
import { CacheDataConfig } from '../help';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  updateStatus(h: boolean|boolean[]): void;
  priority: number;
  cacheDataConfig: CacheDataConfig;
}
