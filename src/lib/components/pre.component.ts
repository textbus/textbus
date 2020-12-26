import { Injector } from '@tanbo/di';
import { Grammar, languages, Token, tokenize } from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-stylus';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';

import {
  BlockFormatter,
  ChildSlotMode, Component,
  ComponentLoader,
  DivisionAbstractComponent,
  FormatAbstractData,
  FormatEffect,
  FormatRendingContext,
  Fragment,
  InlineFormatter, Interceptor,
  ReplaceMode, SlotRendererFn, TBClipboard, TBEvent, TBSelection,
  VElement,
  ViewData
} from '../core/_api';
import { BrComponent } from './br.component';
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
  selector: 'selector',
  property: 'attr-name',
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

  read(): FormatAbstractData {
    return undefined;
  }

  render(): ReplaceMode | ChildSlotMode | null {
    return new ChildSlotMode(new VElement('code'));
  }
}

class CodeStyleFormatter extends InlineFormatter {
  constructor() {
    super({}, 10);
  }

  read(): FormatAbstractData {
    return undefined;
  }

  render(context: FormatRendingContext): ReplaceMode | ChildSlotMode | null {
    const el = new VElement('span');
    el.classes.push(...context.abstractData.classes);
    return new ChildSlotMode(el);
  }
}

const codeStyleFormatter = new CodeStyleFormatter();
const codeFormatter = new CodeFormatter();

class PreComponentLoader implements ComponentLoader {
  private tagName = 'pre';

  match(component: HTMLElement): boolean {
    return component.nodeName.toLowerCase() === this.tagName;
  }

  read(el: HTMLElement): ViewData {
    const component = new PreComponent(el.getAttribute('lang'), el.getAttribute('theme') as PreTheme);
    const fragment = new Fragment();
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
    fn(el, fragment);
    component.slot.from(fragment);
    return {
      component: component,
      slotsMap: []
    };
  }
}

class PreComponentInterceptor implements Interceptor<PreComponent> {
  private selection: TBSelection;

  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
  }

  onEnter(event: TBEvent<PreComponent>) {
    const firstRange = this.selection.firstRange;
    event.instance.slot.insert(new BrComponent(), firstRange.startIndex);
    firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
    event.stopPropagation();
  }

  onPaste(event: TBEvent<PreComponent, TBClipboard>) {

    const text = event.data.text;
    const firstRange = this.selection.firstRange;
    const startIndex = firstRange.startIndex;
    const lines = text.split(/(?=\n)/g);
    let i = 0;
    lines.forEach(item => {
      if (item === '\n') {
        event.instance.slot.insert(new BrComponent(), startIndex + i);
      } else {
        event.instance.slot.insert(item, startIndex + i);
      }
      i += item.length;
    })
    firstRange.setStart(firstRange.startFragment, firstRange.startIndex + text.length);
    firstRange.collapse();
    event.stopPropagation();
  }
}

@Component({
  loader: new PreComponentLoader(),
  interceptor: new PreComponentInterceptor(),
  styles: [
    `
   code, pre {background-color: rgba(0, 0, 0, .03);}
   pre code {padding: 0; border: none; background: none; border-radius: 0; vertical-align: inherit;}
   code {padding: 1px 5px; border-radius: 3px; vertical-align: middle; border: 1px solid rgba(0, 0, 0, .08);}
   pre {line-height: 1.418em; padding: 15px; border-radius: 5px; border: 1px solid #e9eaec; word-break: break-all; word-wrap: break-word; white-space: pre-wrap;}
   code, kbd, pre, samp {font-family: Microsoft YaHei Mono, Menlo, Monaco, Consolas, Courier New, monospace;}`,
    `
  .tb-hl-keyword { font-weight: bold; }
  .tb-hl-string { color: rgb(221, 17, 68) }
  .tb-hl-function { color: rgb(0, 134, 179); }
  .tb-hl-number { color: #388138 }
  .tb-hl-tag { color: rgb(0, 0, 128) }
  .tb-hl-comment { color: rgb(153, 153, 136); font-style: italic; }
  .tb-hl-boolean { color: #388138; font-weight: bold }
  .tb-hl-builtin { color: rgb(0, 134, 179); }
  .tb-hl-regex { color: #f60; }
  .tb-hl-attr-name { color: rgb(0, 128, 128) }
  .tb-hl-attr-value { color: rgb(221, 17, 68) }
  .tb-hl-class-name { color: rgb(0, 134, 179); font-weight: bold }
  .tb-hl-selector { color: rgb(0, 134, 179); font-weight: bold }
  `,
    `
  pre[theme=dark] {color: #a9aeb2; background-color: #1c2838; border-color: #1c2838 }
  pre[theme=dark] .tb-hl-tag {color: rgb(91 155 190)}
  `
  ]
})
export class PreComponent extends DivisionAbstractComponent {
  static theme: PreTheme = 'light';

  constructor(public lang: string, private theme?: PreTheme) {
    super('pre');
  }

  clone() {
    const component = new PreComponent(this.lang);
    component.slot.from(this.slot.clone());
    return component;
  }

  componentContentChange() {
    this.reformat();
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn) {
    const block = new VElement('pre');
    block.attrs.set('lang', this.lang);
    block.attrs.set('theme', this.theme || PreComponent.theme);
    return slotRendererFn(this.slot, block);
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

  private reformat() {
    const languageGrammar = this.getLanguageGrammar();
    const content = this.slot.sliceContents(0).map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (item instanceof BrComponent) {
        return '\n';
      }
    }).join('');
    const fragment = new Fragment();
    content.replace(/\n|[^\n]+/g, str => {
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
