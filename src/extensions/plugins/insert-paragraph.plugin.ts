import { Injectable } from '@tanbo/di';
import { TBPlugin } from '../../lib/plugin';
import { I18n } from '../../lib/i18n';
import { TBSelection } from '../../lib/core/_api';
import { Input } from '../../lib/ui/input';
import { BlockComponent } from '../../lib/components/block.component';
import { BrComponent } from '../../lib/core/component';
import { RootComponent } from '../../lib/root-component';

@Injectable()
export class InsertParagraphPlugin implements TBPlugin {
  constructor(private i18n: I18n,
              private rootComponent: RootComponent,
              private input: Input,
              private selection: TBSelection) {
  }

  setup() {
    this.input.addContextMenus([{
      iconClasses: ['textbus-icon-insert-paragraph-before'],
      label: this.i18n.get('plugins.insertParagraph.insertParagraphBefore'),
      action: () => {
        this.insertParagraph(true)
      }
    }, {
      iconClasses: ['textbus-icon-insert-paragraph-after'],
      label: this.i18n.get('plugins.insertParagraph.insertParagraphAfter'),
      action: () => {
        this.insertParagraph(false)
      }
    }])
  }

  private insertParagraph(insertBefore: boolean) {
    const selection = this.selection;
    if (selection.rangeCount === 0) {
      return;
    }
    const firstRange = selection.firstRange;
    let component = selection.commonAncestorComponent;

    if (component === this.rootComponent) {
      const commonAncestorFragmentScope = firstRange.getCommonAncestorFragmentScope();
      component = insertBefore ?
        commonAncestorFragmentScope.startChildComponent :
        commonAncestorFragmentScope.endChildComponent;
    }

    const parentFragment = component.parentFragment;
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());

    insertBefore ? parentFragment.insertBefore(p, component) : parentFragment.insertAfter(p, component);

    selection.removeAllRanges();
    firstRange.setStart(p.slot, 0);
    firstRange.collapse();
    selection.addRange(firstRange);
  }

}
