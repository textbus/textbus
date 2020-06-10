import { SlotMap, BackboneTemplate, TemplateTranslator, ViewData, Fragment, VElement, EventType } from '../core/_api';

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

  render() {
    const list = new VElement(this.tagName);
    this.childSlots.forEach((slot, index) => {
      const li = new VElement('li');
      li.events.subscribe(event => {
        if (event.type === EventType.onEnter) {
          const firstRange = event.selection.firstRange;
          const {contents, formatRanges} = slot.delete(firstRange.endIndex);
          const next = new Fragment();
          contents.forEach(item => {
            next.append(item);
          });
          formatRanges.forEach(item => {
            next.mergeFormat(item);
          });
          this.childSlots.splice(index + 1, 0, next);
          firstRange.startFragment = firstRange.endFragment = next;
          firstRange.startIndex = firstRange.endIndex = 0;
          event.stopPropagation();
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
