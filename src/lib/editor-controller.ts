import { BehaviorSubject, Observable } from 'rxjs';

export interface GlobalStatus {
  readonly: boolean;
  fullScreen: boolean;
  deviceType: string;
  expandComponentLibrary: boolean;
  sourceCodeMode: boolean;
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

  set fullScreen(b: boolean) {
    this.status.fullScreen = b;
    this.dispatch();
  }

  get fullScreen() {
    return this.status.fullScreen;
  }

  set viewDeviceType(type: string) {
    this.status.deviceType = type;
    this.dispatch();
  }

  get viewDeviceType() {
    return this.status.deviceType;
  }

  set expandComponentLibrary(b: boolean) {
    this.status.expandComponentLibrary = b;
    this.dispatch();
  }

  get expandComponentLibrary() {
    return this.status.expandComponentLibrary;
  }

  set sourceCodeMode(b: boolean) {
    this.status.sourceCodeMode = b;
    this.dispatch();
  }

  get sourceCodeMode() {
    return this.status.sourceCodeMode;
  }

  private stateChangeEvent = new BehaviorSubject(this.status);

  constructor(private status: GlobalStatus) {
    this.onStateChange = this.stateChangeEvent.asObservable();
  }

  private dispatch() {
    this.stateChangeEvent.next(this.status);
  }
}
