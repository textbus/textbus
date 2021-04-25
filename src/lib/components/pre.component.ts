import { Injectable } from '@tanbo/di';
import { Grammar, languages, Token, tokenize } from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-stylus';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';

import {
  BlockFormatter,
  Component,
  ComponentLoader,
  BackboneAbstractComponent,
  FormatData,
  FormatEffect,
  FormatRendingContext,
  Fragment,
  InlineFormatter, Interceptor,
  SlotRenderFn, TBClipboard, TBEvent, TBSelection,
  VElement,
  ViewData, SingleSlotRenderFn,
  BrComponent, ContextMenuAction, VTextNode, DynamicKeymap, KeymapAction
} from '../core/_api';

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

  read(): FormatData {
    return undefined;
  }

  render() {
    return new VElement('code');
  }
}

class CodeStyleFormatter extends InlineFormatter {
  constructor() {
    super({}, 10);
  }

  read(): FormatData {
    return undefined;
  }

  render(context: FormatRendingContext) {
    const el = new VElement('span');
    el.classes.push(...context.formatData.classes);
    return el;
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
    const lines = el.querySelectorAll('.tb-code-line');
    let code: string;
    if (lines.length) {
      code = Array.from(lines).map(i => (i as HTMLElement).innerText.replace(/[\s\n]+$/, '')).join('\n');
    } else {
      el.querySelectorAll('br').forEach(br => {
        br.parentNode.replaceChild(document.createTextNode('\n'), br);
      })
      code = el.innerText;
    }

    const component = new PreComponent(el.getAttribute('lang'), code);
    return {
      component: component,
      slotsMap: []
    };
  }
}

class CodeFragment extends Fragment {
  set blockCommentStart(b: boolean) {
    if (b !== this.isBlockComment) {
      this.isBlockComment = b;
      if (!this.dirty) {
        this.markAsDirtied();
      }
    }
  }

  get blockCommentStart() {
    return this.isBlockComment;
  }

  get code() {
    return this.sliceContents().map(i => {
      if (typeof i === 'string') {
        return i;
      }
      return '\n';
    }).join('');
  }

  blockCommentEnd = true;

  private isBlockComment = false;
}

const languageList = [{
  value: 'Javascript',
}, {
  value: 'HTML',
}, {
  value: 'CSS',
}, {
  value: 'Typescript',
}, {
  value: 'Java',
}, {
  value: 'C',
}, {
  label: 'C++',
  value: 'CPP',
}, {
  label: 'C#',
  value: 'CSharp',
}, {
  value: 'Swift',
}, {
  value: 'Go'
}, {
  value: 'JSON',
}, {
  value: 'Less',
}, {
  value: 'SCSS',
}, {
  value: 'Stylus',
}, {
  value: 'Bash',
}];

@Injectable()
class PreComponentInterceptor implements Interceptor<PreComponent> {
  constructor(private selection: TBSelection) {
  }

  onEnter(event: TBEvent<PreComponent>) {
    const firstRange = this.selection.firstRange;
    const component = event.instance;
    const commonAncestorFragment = firstRange.commonAncestorFragment as CodeFragment;
    const nextSlot = commonAncestorFragment.cut(firstRange.startIndex);

    let offset = 0;
    if (commonAncestorFragment.blockCommentEnd) {
      const code = commonAncestorFragment.code;
      offset = code.replace(/\S.*/g, '').length;
      if (offset % 2) {
        offset--;
      }
      const reg = component.lang === 'HTML' ? /<[\w-]+>/ : /[{(]$/;
      if (reg.test(code.trim())) {
        offset += 2;
      }
      nextSlot.insert(Array.from({length: offset}).fill(' ').join(''), 0);
    }

    const index = component.indexOf(commonAncestorFragment);

    if (commonAncestorFragment.length === 0) {
      commonAncestorFragment.append(new BrComponent());
    }
    if (nextSlot.length === 0) {
      nextSlot.append(new BrComponent());
    }
    const f = new CodeFragment();
    f.blockCommentStart = !commonAncestorFragment.blockCommentEnd && commonAncestorFragment.blockCommentStart;
    f.from(nextSlot);
    component.splice(index + 1, 0, f);
    firstRange.setStart(f, offset);
    firstRange.collapse();
    event.stopPropagation();
  }

  onDeleteRange(event: TBEvent<PreComponent>) {
    const firstRange = this.selection.firstRange;
    if (firstRange.startIndex === 0) {
      const component = event.instance;
      const endFragment = firstRange.endFragment;
      const startIndex = component.indexOf(firstRange.startFragment as CodeFragment);
      const endIndex = component.indexOf(endFragment as CodeFragment);
      component.splice(startIndex, endIndex - startIndex);
      endFragment.remove(0, firstRange.endIndex);
      if (endFragment.length === 0) {
        endFragment.append(new BrComponent());
      }
      firstRange.setStart(endFragment, 0);
      firstRange.collapse();
      event.stopPropagation();
    }
  }

  onPaste(event: TBEvent<PreComponent, TBClipboard>) {
    const text = event.data.text;
    const component = event.instance;
    const firstRange = this.selection.firstRange;
    const commonAncestorFragment = firstRange.commonAncestorFragment as CodeFragment;

    const index = component.indexOf(commonAncestorFragment);
    const lines = text.split(/\n/g);

    if (lines.length === 1) {
      commonAncestorFragment.insert(lines[0], firstRange.startIndex);
      firstRange.startIndex += lines[0].length;
      firstRange.collapse();
    } else {
      const next = commonAncestorFragment.cut(firstRange.startIndex);
      commonAncestorFragment.append(lines.shift());
      const fragments = lines.map(str => {
        const fragment = new CodeFragment();
        fragment.append(str || new BrComponent());
        return fragment;
      });
      const f = new CodeFragment();
      f.from(next);
      component.splice(index + 1, 0, f);
      component.splice(index + 1, 0, ...fragments);
      const position = firstRange.findLastPosition(fragments.pop());
      firstRange.setStart(position.fragment, position.index);
      firstRange.collapse();
    }
    event.stopPropagation();
  }

  onContextmenu(instance: PreComponent): ContextMenuAction[] {
    return languageList.map(i => {
      return {
        label: i.label || i.value,
        action() {
          instance.lang = i.value
        }
      }
    });
  }
}

@Injectable()
class PreComponentDynamicKeymap implements DynamicKeymap<PreComponent> {
  constructor(private selection: TBSelection) {
  }

  provide(instance: PreComponent): KeymapAction[] {
    return [{
      keymap: {
        key: 'Tab'
      },
      action: () => {
        if (this.selection.collapsed) {
          const firstRange = this.selection.firstRange;
          const fragment = firstRange.commonAncestorFragment;
          fragment.insert('  ', firstRange.startIndex);
          firstRange.setPosition(fragment, firstRange.startIndex + 2);
          firstRange.collapse();
        }
      }
    }, {
      keymap: {
        key: '/',
        ctrlKey: true
      },
      action: () => {
        const firstRange = this.selection.firstRange;
        const startIndex = instance.indexOf(firstRange.startFragment as CodeFragment);
        const endIndex = instance.indexOf(firstRange.endFragment as CodeFragment);

        const fragments = Array.from(instance).slice(startIndex, endIndex + 1);
        const isAllComment = fragments.every(f => {
          return /^\s*\/\//.test(f.code);
        })
        if (isAllComment) {
          fragments.forEach(f => {
            const code = f.code;
            const index = code.indexOf('// ');
            const index2 = code.indexOf('//');

            if (index >= 0) {
              f.remove(index, index + 3);
              if (f === firstRange.startFragment) {
                firstRange.startIndex -= 3;
              }
              if (f === firstRange.endFragment) {
                firstRange.endIndex -= 3;
              }
            } else {
              f.remove(index2, index2 + 2);
              if (f === firstRange.startFragment) {
                firstRange.startIndex -= 2;
              }
              if (f === firstRange.endFragment) {
                firstRange.endIndex -= 2;
              }
            }
          })
        } else {
          fragments.forEach(f => {
            f.insert('// ', 0);
          });
          firstRange.startIndex += 3;
          firstRange.endIndex += 3;
        }
      }
    }];
  }
}

@Component({
  loader: new PreComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: PreComponentInterceptor
  }, {
    provide: DynamicKeymap,
    useClass: PreComponentDynamicKeymap
  }],
  styles: [
    `<style>
   code, pre {background-color: #fefefe;}
   pre code {padding: 0; border: none; background: none; border-radius: 0; vertical-align: inherit;}
   code {padding: 1px 5px; border-radius: 3px; vertical-align: middle; border: 1px solid rgba(0, 0, 0, .08);}
   pre {line-height: 1.418em; display: flex; border-radius: 5px; border: 1px solid #e9eaec; word-break: break-all; word-wrap: break-word; white-space: pre-wrap; overflow: hidden; position: relative}
   code, kbd, pre, samp {font-family: Microsoft YaHei Mono, Menlo, Monaco, Consolas, Courier New, monospace;}

   .tb-code-line-number-bg { background-color: #f9f9f9; border-right: 1px solid #ddd; width: 3em; }
   .tb-code-content { flex: 1; padding: 15px 15px 15px 0.5em; counter-reset: codeNum; }
   .tb-code-line { position: relative; }
   .tb-code-line::before { counter-increment: codeNum; content: counter(codeNum); position: absolute; left: -3.5em; top: 0; width: 2em; text-align: right; padding: 0 0.5em; overflow: hidden; white-space: nowrap; color: #aeaeae; }
   .tb-pre-lang { position: absolute; right: 0; top: 0; opacity: 0.5; pointer-events: none; font-size: 13px; padding: 4px 10px;}

  .tb-hl-keyword { font-weight: bold; }
  .tb-hl-string { color: rgb(221, 17, 68) }
  .tb-hl-function { color: rgb(0, 134, 179); }
  .tb-hl-number { color: #388138 }
  .tb-hl-tag { color: rgb(0, 0, 128) }
  .tb-hl-comment { color: rgb(153, 153, 136); font-style: italic; }
  .tb-hl-boolean { color: #388138; font-weight: bold }
  .tb-hl-builtin { color: rgb(0, 134, 179); }
  .tb-hl-regex { color: #f60; }
  .tb-hl-attr-name { color: rgb(0, 134, 179); }
  .tb-hl-attr-value { color: rgb(221, 17, 68) }
  .tb-hl-class-name { color: rgb(0, 134, 179); font-weight: bold }
  .tb-hl-selector { color: rgb(0, 134, 179); font-weight: bold }

  pre[theme=dark] {color: #a9aeb2; background-color: #1c2838; border-color: #1c2838 }
  pre[theme=dark] .tb-hl-keyword {color: rgb(0, 134, 179);}
  pre[theme=dark] .tb-hl-tag {color: rgb(0, 134, 179);}
  pre[theme=dark] .tb-hl-comment {color: #4c5156;}
  pre[theme=dark] .tb-hl-string {color: #ce5a70;}
  pre[theme=dark] .tb-hl-attr-value {color: #ce5a70;}
  pre[theme=dark] .tb-hl-regex {color: #af741d;}
  pre[theme=dark] .tb-hl-selector {color: #ce5a70; font-weight: normal}
  pre[theme=dark] .tb-code-line::before { color: #536171}
  pre[theme=dark] .tb-code-line-number-bg {background-color: #2d3a48; border-right-color: #1b1b1b; }
  `.replace('<style>', '')
  ]
})
export class PreComponent extends BackboneAbstractComponent<CodeFragment> {
  static theme: PreTheme = 'light';

  set lang(v: string) {
    if (v !== this._lang) {
      this._lang = v;
      this.forEach(slot => {
        slot.markAsDirtied();
      })
      this.markAsDirtied();
    }
  }

  get lang() {
    return this._lang;
  }

  private _lang: string

  constructor(lang: string, code: string) {
    super('pre');
    this.lang = lang;
    this.setSourceCode(code);
  }

  public map<U>(callbackFn: (value: CodeFragment, index: number, array: CodeFragment[]) => U, thisArg?: any): U[] {
    return super.map(callbackFn, thisArg);
  }

  public splice(start: number, deleteCount: number, ...items: CodeFragment[]): CodeFragment[] {
    return super.splice(start, deleteCount, ...items);
  }

  clone() {
    const fragments = this.map(slot => {
      const f = new CodeFragment();
      f.from(slot.clone());
      return f;
    });
    const component = new PreComponent(this.lang, '');
    component.clean();
    component.push(...fragments);
    return component;
  }

  canDelete(deletedSlot: CodeFragment): boolean {
    this.splice(this.indexOf(deletedSlot), 1);
    return this.slotCount === 0;
  }

  componentContentChange() {
    this.reformat();
  }

  slotRender(slot: Fragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    const line = new VElement('div', {
      classes: ['tb-code-line']
    });
    return slotRendererFn(slot, line);
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn) {
    const block = new VElement('pre', {
      childNodes: [
        new VElement('div', {
          classes: ['tb-code-line-number-bg']
        }),
        new VElement('div', {
          classes: ['tb-code-content'],
          childNodes: this.map(item => {
            return slotRendererFn(item)
          })
        })
      ]
    });
    let lang = ''
    languageList.forEach(i => {
      if (i.value === this.lang) {
        lang = i.label || i.value;
      }
    })
    if (lang) {
      block.appendChild(new VElement('div', {
        classes: ['tb-pre-lang'],
        childNodes: [new VTextNode(lang)]
      }))
    }
    block.attrs.set('lang', this.lang);
    block.attrs.set('theme', PreComponent.theme);
    return block;
  }

  setSourceCode(code: string) {
    const fragments = code.replace(/[\n\s]+$/g, '').split(/[\n]/).map(lineContent => {
      const fragment = new CodeFragment();
      fragment.append(lineContent || new BrComponent());
      return fragment;
    })
    this.clean();
    this.push(...fragments);
  }

  getSourceCode() {
    return Array.from(this).map(slot => {
      return slot.sliceContents(0).map(i => {
        return typeof i === 'string' ? i.trim() : '';
      }).join('')
    }).join('');
  }

  private reformat() {
    const languageGrammar = this.getLanguageGrammar();
    this.forEach((slot, index) => {
      if (slot.dirty === false) {
        return;
      }
      const [blockCommentStart, blockCommentEnd] = this.getLanguageBlockCommentStart();

      if (slot.blockCommentStart) {
        slot.insert(blockCommentStart, 0);
      }
      const content = slot.sliceContents(0).map(item => {
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
        const lastToken = tokens.pop();
        slot.blockCommentEnd = true;
        const nextSlot = this.getSlotAtIndex(index + 1);
        if (nextSlot) {
          if (typeof lastToken !== 'string' &&
            lastToken.type === 'comment' &&
            (lastToken.content as string).indexOf(blockCommentStart) === 0) {
            slot.blockCommentEnd = new RegExp(blockCommentEnd.replace(new RegExp(`[${blockCommentEnd}]`, 'g'), i => '\\' + i) + '$').test(lastToken.content as string);
            nextSlot.blockCommentStart = !slot.blockCommentEnd;
          } else {
            nextSlot.blockCommentStart = false;
          }
        }
      }
      fragment.apply(codeFormatter, {formatData: null, effect: FormatEffect.Valid});
      if (slot.blockCommentStart) {
        fragment.remove(0, blockCommentStart.length);
      }
      slot.from(fragment);
    })
  }

  private format(tokens: Array<string | Token>, slot: Fragment, index: number) {
    tokens.forEach(token => {
      if (token instanceof Token) {
        const styleName = codeStyles[token.type];
        if (styleName) {
          slot.apply(codeStyleFormatter, {
            startIndex: index,
            endIndex: index + token.length,
            effect: FormatEffect.Valid,
            formatData: new FormatData({
              classes: ['tb-hl-' + styleName]
            })
          });
        } else if (styleName === false) {
          slot.apply(codeStyleFormatter, {
            startIndex: index,
            endIndex: index + token.length,
            effect: FormatEffect.Invalid,
            formatData: null
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
      Swift: languages.swift,
      JSON: languages.json,
      Go: languages.go,
      Ruby: languages.ruby,
      Less: languages.less,
      SCSS: languages.scss,
      Stylus: languages.stylus,
      C: languages.c,
      CPP: languages.cpp,
      CSharp: languages.csharp
    }[this.lang];
  }

  private getLanguageBlockCommentStart(): string[] {
    return {
      HTML: ['<!--', '-->'],
      Javascript: ['/*', '*/'],
      CSS: ['/*', '*/'],
      Typescript: ['/*', '*/'],
      Java: ['/*', '*/'],
      Swift: ['/*', '*/'],
      Go: ['/*', '*/'],
      JSON: ['', ''],
      Less: ['/*', '*/'],
      SCSS: ['/*', '*/'],
      Stylus: ['/*', '*/'],
      C: ['/*', '*/'],
      CPP: ['/*', '*/'],
      CSharp: ['/*', '*/']
    }[this.lang] || ['', ''];
  }
}
