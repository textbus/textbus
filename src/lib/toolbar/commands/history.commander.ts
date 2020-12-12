import { Injector } from '@tanbo/di';

import { Commander, CommandContext } from '../../core/_api';
import { HistoryManager } from '../../history-manager';

export class HistoryCommander implements Commander<null> {
  recordHistory = false;

  private history: HistoryManager;

  constructor(private action: 'forward' | 'back') {
  }

  onInit(injector: Injector) {
    this.history = injector.get(HistoryManager);
  }

  command(context: CommandContext) {
    const snapshot = this.action === 'back' ?
      this.history.getPreviousSnapshot() :
      this.history.getNextSnapshot();
    if (snapshot) {
      context.rootFragment.from(snapshot.contents);
      context.selection.usePaths(snapshot.paths, context.rootFragment);
    }
  }
}
