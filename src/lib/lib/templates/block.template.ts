import { Template, TemplateTranslator, ViewData } from '../core/template';
import { Fragment } from '../core/fragment';
import { VElement } from '../core/element';
import { EventType } from '../core/events';
import { SingleTemplate } from './single.template';

export class BlockTemplateTranslator implements TemplateTranslator {
  constructor(private tagName: string) {
  }

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new BlockTemplate(this.tagName);
    const slot = new Fragment();
    template.childSlots.push(slot);
    return {
      template,
      childrenSlots: [{
        from: el,
        toSlot: slot
      }]
    };
  }
}

export class BlockTemplate extends Template {
  constructor(public readonly tagName: string) {
    super();
  }

  clone() {
    const template = new BlockTemplate(this.tagName);
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  render() {
    const block = new VElement(this.tagName);
    this.viewMap.set(this.childSlots[0], block);
    block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const parent = event.renderer.getParentFragmentByTemplate(this);

        const template = new BlockTemplate(this.tagName);
        const fragment = new Fragment();
        template.childSlots.push(fragment);
        const firstRange = event.selection.firstRange;
        const c = firstRange.startFragment.delete(firstRange.startIndex);
        if (firstRange.startFragment.contentLength === 0) {
          firstRange.startFragment.append(new SingleTemplate('br'));
        }
        if (c.contents.length) {
          c.contents.forEach(cc => fragment.append(cc));
        } else {
          fragment.append(new SingleTemplate('br'));
        }
        c.formatRanges.forEach(ff => fragment.mergeFormat(ff));
        parent.insert(template, parent.find(this) + 1);
        firstRange.startFragment = firstRange.endFragment = fragment
        firstRange.startIndex = firstRange.endIndex = 0;
      }
    })
    return block;
  }
}
