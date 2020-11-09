import {
  CommandContext,
  Commander,
} from '../../core/_api';
import { PreComponent, BrComponent } from '../../components/_api';

export class PreCommander implements Commander<string> {
  recordHistory = true;

  command(context: CommandContext, lang: string): void {
    const {overlap, selection, renderer} = context;
    let b = true;
    if (overlap) {
      selection.ranges.forEach(range => {
        const context = renderer.getContext(range.startFragment, PreComponent);
        if (context.lang === lang) {
          b = false;
          return;
        }
        context.lang = lang;
      });
    } else {
      selection.ranges.forEach(range => {
        const context = range.commonAncestorComponent;
        const parentFragment = context.parentFragment;
        const t = new PreComponent(lang);
        t.slot.append(new BrComponent());
        parentFragment.insertAfter(t, context);
        range.setStart(t.slot, 0);
        range.collapse();
      })
    }
    this.recordHistory = b;
  }
}
