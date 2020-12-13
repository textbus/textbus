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
    this.action === 'back' ?
      this.history.usePreviousSnapshot() :
      this.history.useNextSnapshot();
  }
}
