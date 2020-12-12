import { Injector } from '@tanbo/di';

import { Commander, CommandContext, Fragment } from '../../core/_api';
import { HistoryManager } from '../../history-manager';
import { RootComponent } from '../../root-component';

export class HistoryCommander implements Commander<null> {
  recordHistory = false;

  private history: HistoryManager;
  private rootFragment: Fragment;

  constructor(private action: 'forward' | 'back') {
  }

  onInit(injector: Injector) {
    this.history = injector.get(HistoryManager);
    this.rootFragment = injector.get(RootComponent).slot;
  }

  command(context: CommandContext) {
    const snapshot = this.action === 'back' ?
      this.history.getPreviousSnapshot() :
      this.history.getNextSnapshot();
    if (snapshot) {
      this.rootFragment.from(snapshot.contents);
      context.selection.usePaths(snapshot.paths, this.rootFragment);
    }
  }
}
