import {
  FormatAbstractData,
  FormatDelta,
  Fragment,
  Lifecycle,
  MediaTemplate,
  Parser,
  Renderer,
  Template
} from '../core/_api';
import { CodeTemplate, SingleTemplate } from '../templates/_api';
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

export class CodeHook implements Lifecycle {
  onRender(template: Template | MediaTemplate, renderer: Renderer, parser: Parser) {
    if (template instanceof CodeTemplate) {
      const fragment = template.childSlots[0];

      const sourceCode = fragment.sliceContents(0).map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item instanceof SingleTemplate && item.tagName === 'br') {
          return '\n';
        }
      }).join('');
      fragment.clean();
      if (template.lang && getLanguage(template.lang)) {
        try {
          const html = highlight(template.lang, sourceCode).value.replace(/\n/g, '<br>');
          const div = document.createElement('div');
          div.innerHTML = html;
          this.getFormats(0, div, fragment, parser).formats.forEach(f => {
            fragment.apply(f);
          });
        } catch (e) {
          // console.log(e);
        }
      }
    }
  }

  private getFormats(index: number, node: HTMLElement, context: Fragment, parser: Parser) {
    const start = index;
    const childFormats: Array<FormatDelta> = [];
    Array.from(node.childNodes).forEach(item => {
      if (item.nodeType === 1) {
        if (item.nodeName.toLowerCase() === 'br') {
          index++;
          context.append(new SingleTemplate('br'));
          return;
        }
        const result = this.getFormats(index, item as HTMLElement, context, parser);
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
            formats.push(...parser.getFormattersByAbstractData(abstractData).map(delta => {
              return {
                startIndex: start,
                endIndex: index,
                renderer: delta.formatter,
                state: delta.effect,
                abstractData
              }
            }))
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
