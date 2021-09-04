import { PreComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export class PreCommander implements Commander<string> {
  recordHistory = true;

  command(context: CommandContext, lang: string): void {
    const {overlap, selection} = context;
    let b = true;
    if (overlap) {
      selection.ranges.forEach(range => {
        const context = range.startFragment.getContext(PreComponent);
        if (context.lang === lang) {
          b = false;
          return;
        }
        context.lang = lang;
        context.markAsDirtied();
      });
    } else {
      selection.ranges.forEach(range => {
        const context = range.endFragment.parentComponent;
        const parentFragment = context.parentFragment;
        const t = new PreComponent(lang, '');
        parentFragment.insertAfter(t, context);
        range.setStart(t.getSlotAtIndex(0), 0);
        range.collapse();
      })
    }
    this.recordHistory = b;
  }
}
