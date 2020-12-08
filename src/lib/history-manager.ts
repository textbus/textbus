import { Subscription } from 'rxjs';
import { Inject, Injectable, InjectionToken } from '@tanbo/di';

import { Fragment, RangePath, TBSelection } from './core/_api';

export interface Snapshot {
  contents: Fragment;
  paths: RangePath[];
}

export const HISTORY_STACK_SIZE = new InjectionToken('HISTORY_STACK_SIZE');

@Injectable()
export class HistoryManager {
  get canBack() {
    return this.historySequence.length > 0 && this.historyIndex > 0;
  }

  get canForward() {
    return this.historySequence.length > 0 && this.historyIndex < this.historySequence.length - 1;
  }
  private snapshotSubscription: Subscription;

  private historySequence: Array<Snapshot> = [];
  private historyIndex = 0;
  constructor(@Inject(HISTORY_STACK_SIZE) private historyStackSize = 50) {
  }

  getPreviousSnapshot() {
    if (this.canBack) {
      this.historyIndex--;
      this.historyIndex = Math.max(0, this.historyIndex);
      return HistoryManager.cloneHistoryData(this.historySequence[this.historyIndex]);
    }
    return null;
  }

  getNextSnapshot() {
    if (this.canForward) {
      this.historyIndex++;
      return HistoryManager.cloneHistoryData(this.historySequence[this.historyIndex]);
    }
    return null;
  }

  recordSnapshot(fragment: Fragment, selection: TBSelection) {
    if (this.historySequence.length !== this.historyIndex) {
      this.historySequence.length = this.historyIndex + 1;
    }
    this.historySequence.push({
      contents: fragment.clone(),
      paths: selection ? selection.getRangePaths() : []
    });
    if (this.historySequence.length > this.historyStackSize) {
      this.historySequence.shift();
    }
    this.historyIndex = this.historySequence.length - 1;
  }

  destroy() {
    this.historySequence = null;
  }

  clean() {
    this.historyIndex = 0;
    this.historySequence = [];
  }

  // private listenUserWriteEvent() {
  //   if (this.snapshotSubscription) {
  //     this.snapshotSubscription.unsubscribe();
  //   }
  //   this.snapshotSubscription = this.onUserWrite.pipe(sampleTime(5000)).subscribe(() => {
  //     this.history.recordSnapshot(this.rootFragment, this.selection);
  //   });
  // }


  private static cloneHistoryData(snapshot: Snapshot): Snapshot {
    return {
      contents: snapshot.contents.clone(),
      paths: snapshot.paths.map(i => i)
    }
  }
}
