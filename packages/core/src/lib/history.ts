import { Observable, Subject, Subscription } from 'rxjs';
import { sampleTime } from 'rxjs/operators';
import { forwardRef, Inject, Injectable } from '@tanbo/di';

import {
  BackboneAbstractComponent,
  BranchAbstractComponent, DivisionAbstractComponent,
  Fragment, Renderer,
  TBRange,
  TBRangePosition,
  TBSelection
} from './core/_api';
import { EditorOptions } from './editor-options';
import { EDITABLE_DOCUMENT, EDITOR_OPTIONS } from './inject-tokens';
import { RootComponent } from './root-component';
import { EditorController } from './editor-controller';
import { makeError } from './_utils/make-error';

const historyErrorFn = makeError('History');

/**
 * 记录选区路径数据。
 */
export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

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
              @Inject(forwardRef(() => EDITABLE_DOCUMENT)) private context: Document,
              @Inject(forwardRef(() => Renderer)) private renderer: Renderer,
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
      this.usePaths(snapshot.paths, this.rootComponent.slot);
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
      this.usePaths(snapshot.paths, this.rootComponent.slot);
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
      paths: this.getRangePaths()
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

  /**
   * 获取当前 Selection 所有 Range 的 path
   */
  private getRangePaths(): Array<RangePath> {
    const getPaths = (fragment: Fragment): number[] => {
      const paths = [];
      while (fragment) {
        const parentComponent = fragment.parentComponent;
        if (!parentComponent.parentFragment) {
          break;
        }
        if (parentComponent instanceof BranchAbstractComponent) {
          paths.push(parentComponent.slots.indexOf(fragment))
        } else if (parentComponent instanceof BackboneAbstractComponent) {
          paths.push(parentComponent.indexOf(fragment));
        } else {
          paths.push(0);
        }
        fragment = parentComponent.parentFragment;
        if (fragment) {
          paths.push(fragment.indexOf(parentComponent));
        }
      }
      return paths.reverse();
    };
    return this.selection.ranges.map<RangePath>(range => {
      const paths = getPaths(range.startFragment);
      paths.push(range.startIndex);
      if (range.collapsed) {
        return {
          startPaths: paths,
          endPaths: paths
        }
      } else {
        const endPaths = getPaths(range.endFragment);
        endPaths.push(range.endIndex);
        return {
          startPaths: paths,
          endPaths
        }
      }
    });
  }

  /**
   * 将一组路径应用到当前 Selection
   * @param paths
   * @param fragment
   */
  private usePaths(paths: RangePath[], fragment: Fragment) {
    const findPosition = (position: number[], fragment: Fragment): TBRangePosition => {
      const paths = position.map(i => i).reverse();
      while (true) {
        const index = paths.pop();
        if (paths.length === 0) {
          return {
            fragment,
            index
          }
        }
        const c = fragment.getContentAtIndex(index);
        const last = paths.pop();
        if (c instanceof DivisionAbstractComponent && last === 0) {
          fragment = c.slot;
        } else if (c instanceof BranchAbstractComponent) {
          fragment = c.slots[last];
        } else if (c instanceof BackboneAbstractComponent) {
          fragment = c.getSlotAtIndex(last);
        } else {
          throw historyErrorFn('location of the history range could not be found.')
        }
        if (paths.length === 1) {
          return {
            fragment,
            index: paths.pop()
          }
        }
      }
    };
    let nativeRange: Range;

    if (this.selection.nativeSelection.rangeCount) {
      nativeRange = this.selection.nativeSelection.getRangeAt(0);
    } else {
      nativeRange = this.context.createRange();
    }

    const len = paths.length;
    if (len === 0) {
      return;
    }

    const startPaths = paths[0].startPaths;
    const endPaths = paths[len - 1].endPaths;
    const start = findPosition(startPaths, fragment);
    const range = new TBRange(nativeRange, this.renderer);

    range.setStart(start.fragment, start.index);

    if (endPaths === startPaths) {
      range.setEnd(start.fragment, start.index);
    } else {
      const end = findPosition(endPaths, fragment);
      range.setEnd(end.fragment, end.index);
    }
    this.selection.removeAllRanges();
    this.selection.addRange(range);
  }
}
