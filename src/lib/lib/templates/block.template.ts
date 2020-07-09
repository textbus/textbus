import {
  TemplateTranslator,
  ViewData,
  VElement,
  EventType,
  BranchTemplate
} from '../core/_api';
import { breakingLine } from './utils/breaking-line';

export class BlockTemplateTranslator implements TemplateTranslator {
  constructor(private tagNames: string[]) {
  }

  match(template: HTMLElement): boolean {
    return this.tagNames.includes(template.nodeName.toLowerCase());
  }

  from(el: HTMLElement): ViewData {
    const template = new BlockTemplate(el.tagName.toLocaleLowerCase());
    return {
      template,
      childrenSlots: [{
        from: el,
        toSlot: template.slot
      }]
    };
  }
}

export class BlockTemplate extends BranchTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const template = new BlockTemplate(this.tagName);
    template.slot.from(this.slot.clone());
    return template;
  }

  render(isProduction: boolean) {
    const block = new VElement(this.tagName);
    !isProduction && block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const parent = event.renderer.getParentFragment(this);

        const template = new BlockTemplate('p');
        const firstRange = event.selection.firstRange;
        const next = breakingLine(firstRange.startFragment, firstRange.startIndex);
        template.slot.from(next);
        parent.insert(template, parent.indexOf(this) + 1);
        const position = firstRange.findFirstPosition(template.slot);
        firstRange.startFragment = firstRange.endFragment = position.fragment;
        firstRange.startIndex = firstRange.endIndex = position.index;
        event.stopPropagation();
      }
    })
    return block;
  }
}
