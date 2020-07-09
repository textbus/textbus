import {
  Commander,
  Renderer,
  TBSelection
} from '../../core/_api';
import { PreTemplate, SingleTagTemplate } from '../../templates/_api';

export class PreCommander implements Commander<string> {
  recordHistory = true;
  private lang = '';

  updateValue(value: string) {
    this.lang = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    if (overlap) {
      selection.ranges.forEach(range => {
        const context = renderer.getContext(range.startFragment, PreTemplate);
        context.lang = this.lang;
      });
    } else {
      selection.ranges.forEach(range => {
        const context = range.commonAncestorTemplate;
        const parentFragment = renderer.getParentFragment(context);
        const t = new PreTemplate(this.lang);
        t.slot.append(new SingleTagTemplate('br'));
        parentFragment.insertAfter(t, context);
        range.setStart(t.slot, 0);
        range.collapse();
      })
    }
  }
}
