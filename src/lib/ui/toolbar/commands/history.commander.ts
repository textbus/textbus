import { Injector } from '@tanbo/di';

import { Commander } from '../commander';
import { TBHistory } from '../../../history';

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
