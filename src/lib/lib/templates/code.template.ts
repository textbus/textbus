import {
  BlockFormatter,
  ChildSlotModel,
  EventType,
  FormatAbstractData,
  FormatDelta,
  FormatEffect,
  Fragment,
  InlineFormatter,
  ReplaceModel,
  SingleChildTemplate,
  TemplateTranslator,
  VElement,
  ViewData
} from '../core/_api';
import { SingleTemplate } from './single.template';
import { getLanguage, highlight } from 'highlight.js';

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
    classes: ['hljs-number', 'hljs-literal', 'hljs-variable', 'hljs-template-variable', 'hljs-tag', 'hljs-attr'],
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

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement): ReplaceModel | ChildSlotModel | null {
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

  render(isProduction: boolean, state: FormatEffect, abstractData: FormatAbstractData, existingElement?: VElement): ReplaceModel | ChildSlotModel | null {
    if (!existingElement) {
      existingElement = new VElement('span');
    }
    existingElement.styles.set(abstractData.style.name, abstractData.style.value);
    return new ReplaceModel(existingElement);
  }
}

const codeStyleFormatter = new CodeStyleFormatter();
const codeFormatter = new CodeFormatter();

export class CodeTemplateTranslator implements TemplateTranslator {
  private tagName = 'pre';

  match(template: HTMLElement): boolean {
    return template.nodeName.toLowerCase() === this.tagName;
  }

  from(el: HTMLElement): ViewData {
    const template = new CodeTemplate(el.getAttribute('lang'));
    const slot = new Fragment();
    template.slot = slot;
    return {
      template,
      childrenSlots: [{
        from: (el.children.length === 1 && el.children[0].tagName.toLowerCase()) === 'code' ?
          el.children[0] as HTMLElement :
          el,
        toSlot: slot
      }]
    };
  }
}

export class CodeTemplate extends SingleChildTemplate {
  constructor(public lang: string) {
    super('pre');
  }

  clone() {
    const template = new CodeTemplate(this.lang);
    template.slot = this.slot.clone();
    return template;
  }

  render() {
    this.format();

    const block = new VElement('pre');
    block.attrs.set('lang', this.lang);
    block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const firstRange = event.selection.firstRange;
        this.slot.insert(new SingleTemplate('br'), firstRange.startIndex);
        firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
      }
    })
    this.vDom = block;
    return block;
  }

  private format() {
    const fragment = this.slot;

    const sourceCode = fragment.sliceContents(0).map(item => {
      if (typeof item === 'string') {
        return item;

      } else if (item instanceof SingleTemplate && item.tagName === 'br') {
        return '\n';
      }
    }).join('');
    const blockFormats = fragment.getFormatRanges().filter(f => f.renderer instanceof BlockFormatter);
    fragment.clean();
    fragment.apply({
      renderer: codeFormatter,
      abstractData: new FormatAbstractData({
        tag: 'code'
      }),
      state: FormatEffect.Valid
    });
    blockFormats.forEach(f => fragment.mergeFormat(f));
    if (this.lang && getLanguage(this.lang)) {
      try {
        const html = highlight(this.lang, sourceCode).value.replace(/\n/g, '<br>');
        const div = document.createElement('div');
        div.innerHTML = html;
        this.getFormats(0, div, fragment).formats.forEach(f => {
          fragment.apply(f);
        });
      } catch (e) {
        // console.log(e);
      }
    }
  }

  private getFormats(index: number, node: HTMLElement, context: Fragment) {
    const start = index;
    const childFormats: Array<FormatDelta> = [];
    Array.from(node.childNodes).forEach(item => {
      if (item.nodeType === 1) {
        if (item.nodeName.toLowerCase() === 'br') {
          index++;
          context.append(new SingleTemplate('br'));
          return;
        }
        const result = this.getFormats(index, item as HTMLElement, context);
        index = result.index;
        childFormats.push(...result.formats);
      } else if (item.nodeType === 3) {
        context.append(item.textContent);
        index += item.textContent.length;
      }
    });

    const formats: Array<FormatDelta> = [];
    node.classList.forEach(value => {
      for (const item of theme) {
        if (item.classes.includes(value)) {
          const styles = item.styles;
          Object.keys(styles).forEach(key => {
            const abstractData = new FormatAbstractData({
              style: {
                name: key,
                value: styles[key]
              }
            });
            formats.push({
              startIndex: start,
              endIndex: index,
              renderer: codeStyleFormatter,
              state: FormatEffect.Valid,
              abstractData
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
