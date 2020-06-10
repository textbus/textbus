import {
  BackboneTemplate,
  TemplateTranslator,
  ViewData,
  Fragment,
  VElement,
  EventType,
  SingleChildTemplate
} from '../core/_api';
import { SingleTagTemplate } from './single-tag.template';

export class BlockTemplateTranslator implements TemplateTranslator {
  constructor(private tagNames: string[]) {
  }

  match(template: HTMLElement): boolean {
    return this.tagNames.includes(template.nodeName.toLowerCase());
  }

  from(el: HTMLElement): ViewData {
    const template = new BlockTemplate(el.tagName.toLocaleLowerCase());
    const slot = new Fragment();
    template.slot = slot;
    return {
      template,
      childrenSlots: [{
        from: el,
        toSlot: slot
      }]
    };
  }
}

export class BlockTemplate extends SingleChildTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const template = new BlockTemplate(this.tagName);
    template.slot = this.slot.clone();
    return template;
  }

  render() {
    const block = new VElement(this.tagName);
    this.vDom = block;
    block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const parent = event.renderer.getParentFragmentByTemplate(this);

        const template = new BlockTemplate('p');
        const fragment = new Fragment();
        template.slot = fragment;
        const firstRange = event.selection.firstRange;
        const c = firstRange.startFragment.delete(firstRange.startIndex);
        if (firstRange.startFragment.contentLength === 0) {
          firstRange.startFragment.append(new SingleTagTemplate('br'));
        }
        if (c.contents.length) {
          c.contents.forEach(cc => fragment.append(cc));
        } else {
          fragment.append(new SingleTagTemplate('br'));
        }
        c.formatRanges.forEach(ff => fragment.mergeFormat(ff));
        parent.insert(template, parent.indexOf(this) + 1);
        firstRange.startFragment = firstRange.endFragment = fragment
        firstRange.startIndex = firstRange.endIndex = 0;
        event.stopPropagation();
      }
    })
    return block;
  }
}
