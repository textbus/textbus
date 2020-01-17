import { Hook } from '../../viewer/help';
import { Viewer } from '../../viewer/viewer';
import { Parser } from '../../parser/parser';
import { AbstractData } from '../../parser/abstract-data';
import { Handler } from '../handlers/help';
import { BlockFormat, FormatRange, InlineFormat } from '../../parser/format';
import { Single } from '../../parser/single';
import { Fragment } from '../../parser/fragment';
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

export class CodeHook implements Hook {
  onViewUpdateBefore(viewer: Viewer, parser: Parser, next: () => void): void {
    const commonAncestorFragment = viewer.selection.commonAncestorFragment;

    if (!commonAncestorFragment || !commonAncestorFragment.token) {
      next();
      return;
    }
    const elementRef = commonAncestorFragment.token.elementRef;
    if (/pre/i.test(elementRef.name)) {
      const formatRanges = commonAncestorFragment.getFormatRanges();
      commonAncestorFragment.useFormats(new Map<Handler, FormatRange[]>());

      const code = commonAncestorFragment.sliceContents(0).map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item instanceof Single) {
          return '\n';
        }
      }).join('');

      formatRanges.forEach(item => {
        if (item instanceof BlockFormat || item.startIndex === 0 &&
          item.endIndex === commonAncestorFragment.contentLength) {
          commonAncestorFragment.apply(item, true);
        }
      });
      const lang = (commonAncestorFragment.getFormatRanges().map(format => {
        if (format instanceof BlockFormat) {
          if (format.abstractData.tag === 'pre') {
            return format.abstractData.attrs.get('lang');
          }
        }
        return '';
      }).join('') || 'bash').toLowerCase();
      if (lang && getLanguage(lang)) {
        try {
          const html = highlight(lang, code).value;
          const div = document.createElement('div');
          div.innerHTML = html;
          this.getFormats(0, div, commonAncestorFragment, parser).formats.forEach(f => {
            commonAncestorFragment.apply(f, false);
          });
        } catch (e) {
          // console.log(e);
        }
      }
    }
    next();
  }

  private getFormats(index: number, node: HTMLElement, context: Fragment, parser: Parser) {
    const start = index;
    const childFormats: InlineFormat[] = [];
    Array.from(node.childNodes).forEach(item => {
      if (item.nodeType === 1) {
        const result = this.getFormats(index, item as HTMLElement, context, parser);
        index = result.index;
        childFormats.push(...result.formats);
      } else if (item.nodeType === 3) {
        index += (item as Text).textContent.length;
      }
    });

    const formats: InlineFormat[] = [];
    node.classList.forEach(value => {
      for (const item of theme) {
        if (item.classes.includes(value)) {
          const styles = item.styles;
          Object.keys(styles).forEach(key => {
            formats.push(...parser.getFormatStateByData(new AbstractData({
              style: {
                name: key,
                value: styles[key]
              }
            })).map(delta => {
              return new InlineFormat({
                ...delta,
                context,
                startIndex: start,
                endIndex: index
              })
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
