import { Observable, Subject, Subscription } from 'rxjs';
import { sampleTime } from 'rxjs/operators';
import { forwardRef, Inject, Injectable } from '@tanbo/di';

import { RangePath, TBSelection } from './core/_api';
import { EditorOptions } from './editor-options';
import { EDITOR_OPTIONS } from './inject-tokens';
import { RootComponent } from './root-component';
import { EditorController } from './editor-controller';

export interface Snapshot {
  component: RootComponent;
  paths: RangePath[];
}

/**
 * TextBus 历史记录管理类
 */
@Injectable()
export class TBHistory {
  /** 当历史记录变化时触发 */
  onChange: Observable<void>;
  /** 当历史记录快照被应用时触发 */
  onUsed: Observable<void>;
  /** 是否可返回上一次历史记录 */
  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }
  /** 是否可重做 */
  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }

  private snapshotSubscription: Subscription;
  private stateChangeSubscription: Subscription;

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  private historyStackSize: number;

  private historyChangeEvent = new Subject<void>();
  private historyUsedEvent = new Subject<void>();

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions,
              @Inject(forwardRef(() => TBSelection)) private selection: TBSelection,
              @Inject(forwardRef(() => EditorController)) private editorController: EditorController,
              @Inject(forwardRef(() => RootComponent)) private rootComponent: RootComponent) {
    this.historyStackSize = options.historyStackSize || 50;
    this.onChange = this.historyChangeEvent.asObservable();
    this.onUsed = this.historyUsedEvent.asObservable();
  }

  /**
   * 应用前一次历史记录
   */
  back() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      const snapshot = TBHistory.cloneHistoryData(this.historySequence[this.historyIndex]);
      this.rootComponent.slot.from(snapshot.component.slot);
      this.selection.usePaths(snapshot.paths, this.rootComponent.slot);
      this.listen();
      this.historyUsedEvent.next();
    }
  }

  /**
   * 重做
   */
  forward() {
    if (this.canForward) {
      this.historyIndex++;
      const snapshot = TBHistory.cloneHistoryData(this.historySequence[this.historyIndex]);
      this.rootComponent.slot.from(snapshot.component.slot);
      this.selection.usePaths(snapshot.paths, this.rootComponent.slot);
      this.listen();
      this.historyUsedEvent.next();
    }
  }

  /**
   * 销毁当前历史记录
   */
  destroy() {
    this.historySequence = null;
    this.stateChangeSubscription?.unsubscribe();
    this.stopListen();
  }

  /**
   * 清除历史记录
   */
  clean() {
    this.historyIndex = 0;
    this.historySequence = [];
  }

  /**
   * 开始记录历史
   */
  record() {
    this.recordSnapshot();
    this.listen();
  }

  private stopListen() {
    if (this.snapshotSubscription) {
      this.snapshotSubscription.unsubscribe();
    }
  }

  private listen() {
    this.stopListen();
    this.snapshotSubscription = this.rootComponent.onChange.pipe(sampleTime(5000)).subscribe(() => {
      this.recordSnapshot();
    });
  }

  private recordSnapshot() {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      component: this.rootComponent.clone(),
      paths: this.selection.getRangePaths()
    });
    if (this.historySequence.length > this.historyStackSize) {
      this.historySequence.shift();
    }
    this.historyIndex = this.historySequence.length - 1;
    this.historyChangeEvent.next();
  }

  private static cloneHistoryData(snapshot: Snapshot): Snapshot {
    return {
      component: snapshot.component.clone(),
      paths: snapshot.paths.map(i => i)
    }
  }
}
