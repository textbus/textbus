import { BehaviorSubject, Observable } from 'rxjs';

export interface GlobalStatus {
  readonly: boolean;
}

export class EditorController {
  onStateChange: Observable<GlobalStatus>;

  set readonly(b: boolean) {
    this.status.readonly = b;
    this.dispatch();
  }

  get readonly() {
    return this.status.readonly;
  }
  private stateChangeEvent = new BehaviorSubject(this.status);

  constructor(private status: GlobalStatus) {
    this.onStateChange = this.stateChangeEvent.asObservable();
  }

  private dispatch() {
    this.stateChangeEvent.next({
      ...this.status
    });
  }
}
