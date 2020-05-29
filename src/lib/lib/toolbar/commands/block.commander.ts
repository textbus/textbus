import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';
import { Renderer } from '../../core/renderer';
import { BlockTemplate } from '../../templates/block.template';

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
          blockTemplate.childSlots.push(template.childSlots.shift());
          parentFragment.insert(blockTemplate, parentFragment.find(template));
        }

        if (template.childSlots.length === 0) {
          parentFragment.delete(parentFragment.find(template), 1);
        }
      })
    })
  }
}
