import { Commander, FormatAbstractData, FormatEffect, Renderer, TBSelection } from '../../core/_api';
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
      range.getSelectedScope().forEach(scope => {
        const template = renderer.getParentTemplateByFragment(scope.fragment);
        const parentFragment = renderer.getParentFragmentByTemplate(template);
        const index = template.childSlots.indexOf(scope.fragment);

        if (index === 0) {
          const blockTemplate = new BlockTemplate(this.tagName);
          const fragment = template.childSlots.shift();
          if (/h[1-6]/.test(this.tagName)) {
            fragment.mergeFormat({
              state: FormatEffect.Inherit,
              startIndex: 0,
              endIndex: fragment.contentLength,
              abstractData: new FormatAbstractData({
                tag: 'strong'
              }),
              renderer: boldFormatter
            })
          } else if (this.tagName === 'p') {
            const flag = /h[1-6]/.test(template.tagName);
            if (flag) {
              fragment.mergeFormat({
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
          blockTemplate.childSlots.push(fragment);
          parentFragment.insert(blockTemplate, parentFragment.indexOf(template));
        }

        if (template.childSlots.length === 0) {
          parentFragment.delete(parentFragment.indexOf(template), 1);
        }
      })
    })
  }
}
