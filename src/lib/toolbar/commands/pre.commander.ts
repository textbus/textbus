import {
  CommandContext,
  Commander,
  Fragment,
} from '../../core/_api';
import { PreComponent, BrComponent } from '../../components/_api';

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
      });
    } else {
      selection.ranges.forEach(range => {
        const context = range.endFragment.parentComponent;
        const parentFragment = context.parentFragment;
        const slot = new Fragment();
        const t = new PreComponent(lang, [slot]);
        slot.append(new BrComponent());
        parentFragment.insertAfter(t, context);
        range.setStart(slot, 0);
        range.collapse();
      })
    }
    this.recordHistory = b;
  }
}
