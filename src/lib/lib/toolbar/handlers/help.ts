import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { CacheDataConfig } from '../utils/cache-data';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  cacheDataConfig: CacheDataConfig;

  updateStatus?(commonMatchDelta: CommonMatchDelta): void;
}
