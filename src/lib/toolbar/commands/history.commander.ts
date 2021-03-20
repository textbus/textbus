import { Injector } from '@tanbo/di';

import { Commander } from '../../core/_api';
import { HistoryManager } from '../../history-manager';

export class HistoryCommander implements Commander<null> {
  recordHistory = false;

  private history: HistoryManager;

  constructor(private action: 'forward' | 'back') {
  }

  setup(injector: Injector) {
    this.history = injector.get(HistoryManager);
  }

  command() {
    this.action === 'back' ?
      this.history.back() :
      this.history.forward();
  }
}
