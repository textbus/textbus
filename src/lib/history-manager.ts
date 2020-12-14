import { Observable, Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, map, sampleTime } from 'rxjs/operators';
import { forwardRef, Inject, Injectable, InjectionToken } from '@tanbo/di';

import { Fragment, RangePath, TBSelection } from './core/_api';
import { EDITOR_OPTIONS, EditorOptions } from './editor';
import { RootComponent } from './root-component';
import { EditorController } from './editor-controller';

export interface Snapshot {
  contents: Fragment;
  paths: RangePath[];
}

export const HISTORY_STACK_SIZE = new InjectionToken<number>('HISTORY_STACK_SIZE');

@Injectable()
export class HistoryManager {
  onChange: Observable<void>;

  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }

  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }

  private snapshotSubscription: Subscription;

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  private historyStackSize: number;

  private historyChangeEvent = new Subject<void>();

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              @Inject(forwardRef(() => TBSelection)) private selection: TBSelection,
              @Inject(forwardRef(() => EditorController)) private editorController: EditorController,
              @Inject(forwardRef(() => RootComponent)) private rootComponent: RootComponent) {
    this.historyStackSize = options.historyStackSize || 50;
    this.onChange = this.historyChangeEvent.asObservable();
  }

  startListen() {
    this.editorController.onStateChange.pipe(map(s => s.sourceCodeMode), distinctUntilChanged()).subscribe(b => {
      if (b) {
        this.stopListen();
      } else {
        this.recordSnapshot();
        this.listenUserWriteEvent();
      }
    })
  }

  usePreviousSnapshot() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      const snapshot = HistoryManager.cloneHistoryData(this.historySequence[this.historyIndex]);
      this.rootComponent.slot.from(snapshot.contents);
      this.selection.usePaths(snapshot.paths, this.rootComponent.slot);
      this.listenUserWriteEvent();
    }
  }

  useNextSnapshot() {
    if (this.canForward) {
      this.historyIndex++;
      const snapshot = HistoryManager.cloneHistoryData(this.historySequence[this.historyIndex]);
      this.rootComponent.slot.from(snapshot.contents);
      this.selection.usePaths(snapshot.paths, this.rootComponent.slot);
      this.listenUserWriteEvent();
    }
  }

  destroy() {
    this.historySequence = null;
  }

  clean() {
    this.historyIndex = 0;
    this.historySequence = [];
  }

  private stopListen() {
    if (this.snapshotSubscription) {
      this.snapshotSubscription.unsubscribe();
    }
  }

  private listenUserWriteEvent() {
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
      contents: this.rootComponent.slot.clone(),
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
      contents: snapshot.contents.clone(),
      paths: snapshot.paths.map(i => i)
    }
  }
}
