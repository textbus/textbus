import { Injector, TBHistory } from '@textbus/core';

import { Commander } from '../commander';

export class HistoryCommander implements Commander<null> {
  recordHistory = false;

  private history: TBHistory;

  constructor(private action: 'forward' | 'back') {
  }

  setup(injector: Injector) {
    this.history = injector.get(TBHistory);
  }

  command() {
    this.action === 'back' ?
      this.history.back() :
      this.history.forward();
  }
}
