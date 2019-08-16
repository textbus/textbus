import { Observable } from 'rxjs';
import { Matcher, MatchStatus } from '../../matcher';

export interface Handler {
  host: HTMLElement;
  onAction: Observable<any>;
  matcher: Matcher;

  updateStatus(status: MatchStatus): void;
}
