import {
  BlockFormatter,
  ChildSlotModel,
  EventType,
  FormatAbstractData,
  FormatEffect,
  Fragment,
  InlineFormatter,
  ReplaceModel,
  DivisionComponent,
  ComponentReader,
  VElement,
  ViewData, InlineFormatParams
} from '../core/_api';
import { BrComponent } from './br.component';
import { highlight } from 'highlight.js';

const theme = [
  {
    classes: ['hljs'],
    styles: {
      color: '#333',
      backgroundColor: '#f8f8f8'
    }
  }, {
    classes: ['hljs-comment', 'hljs-quote'],
    styles: {
      color: '#998',
      fontStyle: 'italic'
    }
  }, {
    classes: ['hljs-keyword', 'hljs-selector-tag', 'hljs-subst'],
    styles: {
      color: '#333',
      fontWeight: 'bold'
    }
  }, {
    classes: ['hljs-number', 'hljs-literal', 'hljs-variable', 'hljs-component-variable', 'hljs-tag', 'hljs-attr'],
    styles: {
      color: '#008080'
    }
  }, {
    classes: ['hljs-string', 'hljs-doctag'],
    styles: {
      color: '#d14'
    }
  }, {
    classes: ['hljs-title', 'hljs-section', 'hljs-selector-id'],
    styles: {
      color: '#900',
      fontWeight: 'bold'
    }
  }, {
    classes: ['hljs-subst'],
    styles: {
      fontWeight: 'normal'
    }
  }, {
    classes: ['hljs-type', 'hljs-class', 'hljs-title'], styles: {
      color: '#458',
      fontWeight: 'bold'
    }
  }, {
    classes: ['hljs-tag', 'hljs-name', 'hljs-attribute'],
    styles: {
      color: '#000080',
      fontWeight: 'normal'
    }
  }, {
    classes: ['hljs-regexp', 'hljs-link'],
    styles: {
      color: '#009926'
    }
  }, {
    classes: ['hljs-symbol', 'hljs-bullet'],
    styles: {
      color: '#990073'
    }
  }, {
    classes: ['hljs-built_in', 'hljs-builtin-name'],
    styles: {
      color: '#0086b3'
    }
  }, {
    classes: ['hljs-meta'],
    styles: {
      color: '#999',
      fontWeight: 'bold'
    }
  }, {
    classes: ['hljs-deletion'],
    styles: {
      backgroundColor: '#fdd'
    }
  }, {
    classes: ['hljs-addition'],
    styles: {
      backgroundColor: '#dfd'
    }
  }, {
    classes: ['hljs-emphasis'],
    styles: {
      fontStyle: 'italic'
    }
  }, {
    classes: ['hljs-strong'],
    styles: {
      fontWeight: 'bold'
    }
  }
];

class CodeFormatter extends BlockFormatter {
  constructor() {
    super({}, 1);
  }

  read(node: HTMLElement): FormatAbstractData {
    return undefined;
  }

  render(isOutputModel: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement): ReplaceModel | ChildSlotModel | null {
    return new ChildSlotModel(new VElement('code'));
  }
}

class CodeStyleFormatter extends InlineFormatter {
  constructor() {
    super({}, 10);
  }

  read(node: HTMLElement): FormatAbstractData {
    return undefined;
  }

  render(isOutputModel: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement): ReplaceModel | ChildSlotModel | null {
    if (!existingElement) {
      existingElement = new VElement('span');
    }
    abstractData.styles.forEach((value, key) => {
      existingElement.styles.set(key, value);
    })
    return new ReplaceModel(existingElement);
  }
}

const codeStyleFormatter = new CodeStyleFormatter();
const codeFormatter = new CodeFormatter();

export class PreComponentReader implements ComponentReader {
  private tagName = 'pre';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const component = new PreComponent(el.getAttribute('lang'));
    const fn = function (node: HTMLElement, fragment: Fragment) {
      node.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          fragment.append(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (/br/i.test(node.nodeName)) {
            fragment.append(new BrComponent());
          } else {
            fn(node as HTMLElement, fragment);
          }
        }
      })
    };
    fn(el, component.slot);
    return {
      component: component,
      slotsMap: []
    };
  }
}

export class PreComponent extends DivisionComponent {
  private vEle: VElement;

  constructor(public lang: string) {
    super('pre');
  }

  getSlotView(): VElement {
    return this.vEle;
  }

  clone() {
    const component = new PreComponent(this.lang);
    component.slot.from(this.slot.clone());
    return component;
  }

  render(isOutputModel: boolean) {
    this.format();
    const block = new VElement('pre');
    block.attrs.set('lang', this.lang);
    this.vEle = block;
    !isOutputModel && block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const firstRange = event.selection.firstRange;
        this.slot.insert(new BrComponent(), firstRange.startIndex);
        firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
        event.stopPropagation();
      }
    })
    return block;
  }

  private format() {
    const fragment = this.slot;

    const sourceCode = fragment.sliceContents(0).map(item => {
      if (typeof item === 'string') {
        return item;

      } else if (item instanceof BrComponent) {
        return '\n';
      }
    }).join('');
    const blockFormats = Array.from(fragment.getFormatKeys())
      .filter(f => f instanceof BlockFormatter).map(token => {
        return {
          token,
          ranges: fragment.getFormatRanges(token)
        }
      });
    fragment.clean();
    fragment.apply(codeFormatter, {
      abstractData: new FormatAbstractData({
        tag: 'code'
      }),
      state: FormatEffect.Valid
    });
    blockFormats.forEach(c => {
      c.ranges.forEach(r => {
        fragment.apply(c.token, r);
      })
    });
    const lang = this.lang || 'bash';
    try {
      const html = highlight(lang, sourceCode).value.replace(/\n/g, '<br>');
      const div = document.createElement('div');
      div.innerHTML = html;
      this.getFormats(0, div, fragment).formats.forEach(f => {
        fragment.apply(codeStyleFormatter, f);
      });
    } catch (e) {
      // console.log(e);
    }
  }

  private getFormats(index: number, node: HTMLElement, context: Fragment) {
    const start = index;
    const childFormats: Array<InlineFormatParams> = [];
    Array.from(node.childNodes).forEach(item => {
      if (item.nodeType === Node.ELEMENT_NODE) {
        if (item.nodeName.toLowerCase() === 'br') {
          index++;
          context.append(new BrComponent());
          return;
        }
        const result = this.getFormats(index, item as HTMLElement, context);
        index = result.index;
        childFormats.push(...result.formats);
      } else if (item.nodeType === Node.TEXT_NODE) {
        context.append(item.textContent);
        index += item.textContent.length;
      }
    });

    const formats: Array<InlineFormatParams> = [];
    node.classList.forEach(value => {
      for (const item of theme) {
        if (item.classes.includes(value)) {
          const styles = item.styles;
          formats.push({
            startIndex: start,
            endIndex: index,
            state: FormatEffect.Valid,
            abstractData: new FormatAbstractData({
              styles
            })
          })
        }
      }
    });
    formats.push(...childFormats);
    return {
      index,
      formats
    };
  }
}
