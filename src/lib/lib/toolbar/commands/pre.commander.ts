import {
  Commander,
  Renderer,
  TBSelection
} from '../../core/_api';
import { PreComponent, BrComponent } from '../../components/_api';

export class PreCommander implements Commander<string> {
  recordHistory = true;

  command(selection: TBSelection, lang: string, overlap: boolean, renderer: Renderer): void {
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
        const parentFragment = renderer.getParentFragment(context);
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
