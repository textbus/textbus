import { DropdownHandlerOption } from '../help';
import { Handler } from './help';
import { Observable, Subject } from 'rxjs';
import { Matcher, MatchStatus } from '../../matcher';

export class DropdownHandler implements Handler {
  host = document.createElement('span');
  matcher: Matcher;
  onAction: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private handler: DropdownHandlerOption) {
    this.onAction = this.eventSource.asObservable();
  }
  updateStatus(status: MatchStatus): void {

  }
}
