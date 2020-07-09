import { SlotMap, BackboneTemplate, TemplateTranslator, ViewData, Fragment, VElement, EventType } from '../core/_api';
import { SingleTagTemplate } from './single-tag.template';
import { BlockTemplate } from './block.template';

export class ListTemplateTranslator implements TemplateTranslator {

  constructor(private tagName: string) {
  }

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new ListTemplate(this.tagName);
    const childrenSlots: SlotMap[] = [];

    const childNodes = Array.from(el.childNodes);
    while (childNodes.length) {
      const slot = new Fragment();
      template.childSlots.push(slot);
      let first = childNodes.shift();
      let newLi: HTMLElement;
      while (first) {
        if (/^li$/i.test(first.nodeName)) {
          childrenSlots.push({
            from: first as HTMLElement,
            toSlot: slot
          })
          break;
        }
        if (!newLi) {
          newLi = document.createElement('li');
        }
        newLi.appendChild(first);
        first = childNodes.shift();
      }
      if (newLi) {
        childrenSlots.push({
          from: newLi,
          toSlot: slot
        })
        newLi = null;
      }
    }
    return {
      template,
      childrenSlots
    };
  }
}

export class ListTemplate extends BackboneTemplate {
  constructor(tagName: string) {
    super(tagName);
  }

  clone() {
    const template = new ListTemplate(this.tagName);
    this.childSlots.forEach(f => {
      template.childSlots.push(f.clone());
    });
    return template;
  }

  canSplit(): boolean {
    return true;
  }

  render(isProduction: boolean) {
    const list = new VElement(this.tagName);
    this.viewMap.clear();
    this.childSlots.forEach((slot, index) => {
      const li = new VElement('li');
      !isProduction && li.events.subscribe(event => {
        if (event.type === EventType.onEnter) {
          event.stopPropagation();

          const firstRange = event.selection.firstRange;
          if (slot === this.childSlots[this.childSlots.length - 1]) {
            const lastContent = slot.getContentAtIndex(slot.contentLength - 1);
            if (slot.contentLength === 0 ||
              slot.contentLength === 1 && lastContent instanceof SingleTagTemplate && lastContent.tagName === 'br') {
              this.childSlots.pop();
              const parentFragment = event.renderer.getParentFragment(this);
              const p = new BlockTemplate('p');
              p.slot.from(new Fragment());
              p.slot.append(new SingleTagTemplate('br'));
              parentFragment.insertAfter(p, this);
              firstRange.setStart(p.slot, 0);
              firstRange.collapse();
              return;
            }
          }
          const {contents, formatRanges} = slot.delete(firstRange.endIndex);
          const next = new Fragment();
          if (slot.contentLength === 0) {
            slot.append(new SingleTagTemplate('br'));
          }
          contents.forEach(item => {
            next.append(item);
          });
          formatRanges.forEach(item => {
            next.apply(item);
          });

          if (next.contentLength === 0) {
            next.append(new SingleTagTemplate('br'))
          }
          this.childSlots.splice(index + 1, 0, next);
          firstRange.startFragment = firstRange.endFragment = next;
          firstRange.startIndex = firstRange.endIndex = 0;
        }
      });
      list.appendChild(li);
      this.viewMap.set(slot, li);
    })
    return list;
  }

  split(startIndex: number, endIndex: number) {
    return {
      before: this.childSlots.slice(0, startIndex),
      center: this.childSlots.slice(startIndex, endIndex),
      after: this.childSlots.slice(endIndex)
    }
  }
}
