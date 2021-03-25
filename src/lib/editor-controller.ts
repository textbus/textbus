import { BehaviorSubject, Observable } from 'rxjs';

export interface GlobalStatus {
  readonly: boolean;
  sourcecodeMode: boolean;
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
  set sourceCodeMode(b: boolean) {
    this.status.sourcecodeMode = b;
    this.dispatch();
  }

  get sourceCodeMode() {
    return this.status.sourcecodeMode;
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
