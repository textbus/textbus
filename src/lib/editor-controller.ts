import { BehaviorSubject, Observable } from 'rxjs';

/**
 * 全局状态接口
 */
export interface GlobalStatus {
  /**只读 */
  readonly: boolean;
  /**是否全屏 */
  fullScreen: boolean;
  /**设备类型 */
  deviceType: string;
  /**是否显示扩展库 */
  expandComponentLibrary: boolean;
  /**是否是源码模式 */
  sourceCodeMode: boolean;
}

/**
 * 编辑器状态控制器
 */
export class EditorController {
  /**当TextBus状态改变时触发 */
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
    if (b) {
      this.expandComponentLibraryCache = this.expandComponentLibrary;
      this.status.expandComponentLibrary = false;
    } else {
      this.status.expandComponentLibrary = this.expandComponentLibraryCache;
    }
    this.dispatch();
  }

  get sourceCodeMode() {
    return this.status.sourceCodeMode;
  }

  private expandComponentLibraryCache = this.expandComponentLibrary;

  private stateChangeEvent = new BehaviorSubject(this.status);

  constructor(private status: GlobalStatus) {
    this.onStateChange = this.stateChangeEvent.asObservable();
  }

  /**
   * 触发状态改变
   * @private
   */
  private dispatch() {
    this.stateChangeEvent.next({
      ...this.status
    });
  }
}
