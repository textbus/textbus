import {
  BackboneTemplate,
  Commander,
  FormatAbstractData,
  FormatEffect,
  Fragment,
  Renderer, BranchTemplate,
  TBSelection
} from '../../core/_api';
import { BlockTemplate } from '../../templates/block.template';
import { boldFormatter } from '../../formatter/bold.formatter';

export class BlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  updateValue(value: string): void {
    this.tagName = value;
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    selection.ranges.forEach(range => {

      range.getSuccessiveContents().forEach(scope => {
        const blockTemplate = new BlockTemplate(this.tagName);

        if (scope.startIndex === 0 && scope.endIndex === scope.fragment.contentLength) {
          const parentTemplate = renderer.getParentTemplateByFragment(scope.fragment);
          if (parentTemplate instanceof BranchTemplate) {
            const parentFragment = renderer.getParentFragmentByTemplate(parentTemplate);
            blockTemplate.slot = scope.fragment;
            parentFragment.insertBefore(blockTemplate, parentTemplate);
            parentFragment.delete(parentFragment.indexOf(parentTemplate), 1);
            this.effect(blockTemplate.slot, parentTemplate.tagName);
          } else {
            const index = parentTemplate.childSlots.indexOf(scope.fragment);
            blockTemplate.slot = scope.fragment;
            this.effect(blockTemplate.slot, parentTemplate.tagName);
            const fragment = new Fragment();
            fragment.append(blockTemplate);
            parentTemplate.childSlots.splice(index, 1, fragment);
          }
        } else {
          blockTemplate.slot = new Fragment();
          const c = scope.fragment.delete(scope.startIndex, scope.endIndex - scope.startIndex);
          c.contents.forEach(cc => blockTemplate.slot.append(cc));
          c.formatRanges.forEach(ff => blockTemplate.slot.apply(ff));
          scope.fragment.insert(blockTemplate, scope.startIndex);
          this.effect(blockTemplate.slot, '');
        }
      })
    })
  }

  private effect(fragment: Fragment, oldTagName: string) {
    if (/h[1-6]/.test(this.tagName)) {
      fragment.apply({
        state: FormatEffect.Inherit,
        startIndex: 0,
        endIndex: fragment.contentLength,
        abstractData: new FormatAbstractData({
          tag: 'strong'
        }),
        renderer: boldFormatter
      })
    } else if (this.tagName === 'p') {
      const flag = /h[1-6]/.test(oldTagName);
      if (flag) {
        fragment.apply({
          state: FormatEffect.Invalid,
          startIndex: 0,
          endIndex: fragment.contentLength,
          abstractData: new FormatAbstractData({
            tag: 'strong'
          }),
          renderer: boldFormatter
        })
      }
    }
  }
}
