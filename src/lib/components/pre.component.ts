import {
  BlockFormatter,
  ChildSlotModel,
  ComponentReader,
  DivisionComponent,
  EventType,
  FormatAbstractData,
  FormatEffect,
  FormatRendingContext,
  Fragment,
  InlineFormatter,
  ReplaceModel,
  VElement,
  ViewData
} from '../core/_api';
import { BrComponent } from './br.component';
import { Grammar, languages, Token, tokenize } from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-stylus';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';

export const codeStyles = {
  keyword: 'keyword',
  string: 'string',
  function: 'function',
  number: 'number',
  tag: 'tag',
  comment: 'comment',
  boolean: 'boolean',
  operator: false,
  builtin: 'builtin',
  punctuation: false,
  regex: 'regex',
  'class-name': 'class-name',
  'attr-name': 'attr-name',
  'attr-value': 'attr-value',
  'template-punctuation': 'string',
};

export type PreTheme = 'dark' | 'light';

class CodeFormatter extends BlockFormatter {
  constructor() {
    super({}, 1);
  }

  read(node: HTMLElement): FormatAbstractData {
    return undefined;
  }

  render(context: FormatRendingContext, existingElement?: VElement): ReplaceModel | ChildSlotModel | null {
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

  render(context: FormatRendingContext, existingElement?: VElement): ReplaceModel | ChildSlotModel | null {
    if (!existingElement) {
      existingElement = new VElement('span');
    }
    existingElement.classes.push(...context.abstractData.classes);
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
    const component = new PreComponent(el.getAttribute('lang'), el.getAttribute('theme') as PreTheme);
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
  static theme: PreTheme= 'light';
  private vEle: VElement;

  constructor(public lang: string, private theme?: PreTheme) {
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

  render(isOutputMode: boolean) {
    const languageGrammar = this.getLanguageGrammar();
    const content = this.slot.sliceContents(0).map(item => {
      if (typeof item === 'string') {
        return item;

      } else if (item instanceof BrComponent) {
        return '\n';
      }
    }).join('');
    const fragment = new Fragment();
    content.replace(/\n|[^\n]/g, str => {
      fragment.append(str === '\n' ? new BrComponent() : str);
      return '';
    })
    if (languageGrammar) {
      const tokens = tokenize(content, languageGrammar);
      this.format(tokens, fragment, 0);
    }
    this.slot.getFormatKeys().forEach(format => {
      if (format instanceof BlockFormatter) {
        this.slot.getFormatRanges(format).forEach(r => {
          fragment.apply(format, r);
        })
      }
    })
    fragment.apply(codeFormatter, {abstractData: null, state: FormatEffect.Valid});
    this.slot.from(fragment);
    const block = new VElement('pre');
    block.attrs.set('lang', this.lang);
    block.attrs.set('theme', this.theme || PreComponent.theme);
    this.vEle = block;
    !isOutputMode && block.events.subscribe(event => {
      if (event.type === EventType.onEnter) {
        const firstRange = event.selection.firstRange;
        this.slot.insert(new BrComponent(), firstRange.startIndex);
        firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
        event.stopPropagation();
      } else if (event.type === EventType.onPaste) {
        const text = event.data.clipboard.text as string;
        const firstRange = event.selection.firstRange;
        const startIndex = firstRange.startIndex;
        const lines = text.split(/(?=\n)/g);
        let i = 0;
        lines.forEach(item => {
          if (item === '\n') {
            this.slot.insert(new BrComponent(), startIndex + i);
          } else {
            this.slot.insert(item, startIndex + i);
          }
          i += item.length;
        })
        firstRange.setStart(firstRange.startFragment, firstRange.startIndex + text.length);
        firstRange.collapse();
        event.stopPropagation();
      }
    })
    return block;
  }

  format(tokens: Array<string | Token>, slot: Fragment, index: number) {
    tokens.forEach(token => {
      if (token instanceof Token) {
        const styleName = codeStyles[token.type];
        if (styleName) {
          slot.apply(codeStyleFormatter, {
            startIndex: index,
            endIndex: index + token.length,
            state: FormatEffect.Valid,
            abstractData: new FormatAbstractData({
              classes: ['tb-hl-' + styleName]
            })
          });
        } else if (styleName === false) {
          slot.apply(codeStyleFormatter, {
            startIndex: index,
            endIndex: index + token.length,
            state: FormatEffect.Invalid,
            abstractData: null
          })
        }
        if (Array.isArray(token.content)) {
          this.format(token.content, slot, index);
        }
      }
      index += token.length;
    })
  }

  private getLanguageGrammar(): Grammar {
    return {
      HTML: languages.html,
      Javascript: languages.javascript,
      CSS: languages.css,
      Typescript: languages.typescript,
      Java: languages.java,
      Shell: languages.shell,
      Python: languages.python,
      Swift: languages.swift,
      JSON: languages.json,
      Ruby: languages.ruby,
      Less: languages.less,
      SCSS: languages.scss,
      Stylus: languages.stylus,
      C: languages.c,
      CPP: languages.cpp,
      CSharp: languages.csharp
    }[this.lang];
  }
}
