import { Injector } from '@tanbo/di'
import {
  ComponentInstance,
  ContentType,
  defineComponent, Formats,
  Formatter,
  FormatType, FormatValue, onContextMenu,
  onDelete,
  onEnter, onPaste,
  Slot, SlotLiteral,
  SlotRender,
  Slots, TBSelection,
  Translator, useContext,
  useSlots, useState,
  VElement,
  VTextNode
} from '@textbus/core'
import { ComponentLoader } from '@textbus/browser'
import { Grammar, languages, Token, tokenize } from 'prismjs'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-powershell'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-less'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-stylus'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-go'

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
}

const languageList: Array<{ label: string, value: string }> = [{
  label: 'JavaScript',
  value: 'JavaScript',
}, {
  label: 'HTML',
  value: 'HTML',
}, {
  label: 'CSS',
  value: 'CSS',
}, {
  label: 'TypeScript',
  value: 'TypeScript',
}, {
  label: 'Java',
  value: 'Java',
}, {
  label: 'C',
  value: 'C',
}, {
  label: 'C++',
  value: 'CPP',
}, {
  label: 'C#',
  value: 'CSharp',
}, {
  label: 'Swift',
  value: 'Swift',
}, {
  label: 'Go',
  value: 'Go'
}, {
  label: 'JSON',
  value: 'JSON',
}, {
  label: 'Less',
  value: 'Less',
}, {
  label: 'SCSS',
  value: 'SCSS',
}, {
  label: 'Stylus',
  value: 'Stylus',
}, {
  label: 'Bash',
  value: 'Bash',
}]

export interface PreComponentState {
  lang: string
  code: string
}

export const codeStyleFormatter: Formatter = {
  type: FormatType.Attribute,
  name: 'code',
  render(node: VElement | null, formatValue: string) {
    return new VElement('span', {
      class: 'tb-hl-' + formatValue
    })
  }
}

function getLanguageBlockCommentStart(lang: string): [string, string] {
  const types: Record<string, [string, string]> = {
    HTML: ['<!--', '-->'],
    JavaScript: ['/*', '*/'],
    CSS: ['/*', '*/'],
    TypeScript: ['/*', '*/'],
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
  }
  return types[lang] || ['', '']
}

function getLanguageGrammar(lang: string): Grammar | null {
  return {
    HTML: languages.html,
    JavaScript: languages.javascript,
    CSS: languages.css,
    TypeScript: languages.typescript,
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
  }[lang] || null
}

function format(tokens: Array<string | Token>, slot: Slot, index: number) {
  tokens.forEach(token => {
    if (token instanceof Token) {
      const styleName = codeStyles[token.type]
      slot.retain(index)
      slot.retain(index + token.length, codeStyleFormatter, styleName || null)
      if (Array.isArray(token.content)) {
        format(token.content, slot, index)
      }
    }
    index += token.length
  })
}

function formatCodeLines(lines: string[], startBlock: boolean, blockCommentStartString: string, languageGrammar: Grammar | null) {
  return lines.map(i => {
    const slot = new CodeSlot()
    slot.blockCommentStart = startBlock
    if (slot.blockCommentStart) {
      i = blockCommentStartString + i
    }
    slot.insert(i)
    if (languageGrammar) {
      const tokens = tokenize(i, languageGrammar)
      format(tokens, slot, 0)
      if (slot.blockCommentStart) {
        slot.retain(2)
        slot.delete(2)
      }
      const lastToken = tokens.pop()
      startBlock = !!lastToken && typeof lastToken !== 'string' &&
        lastToken.type === 'comment' &&
        (lastToken.content as string).indexOf(blockCommentStartString) === 0
      slot.blockCommentEnd = !startBlock
    } else {
      slot.blockCommentEnd = true
    }
    return slot
  })
}

function reformat(slots: Slots<CodeSlotSlotLiteral, CodeSlot>, startSlot: CodeSlot, languageGrammar: Grammar, commentStartString: string, forceFormat = false) {
  const list = slots.toArray()
  let i = list.indexOf(startSlot)
  // if (list[0]) {
  //   list[0].blockCommentStart = startSlot.blockCommentEnd
  // }
  for (; i < list.length; i++) {
    const slot = list[i]
    let code = slot.sliceContent()[0] as string
    if (slot.blockCommentStart) {
      code = commentStartString + code
    }

    const shadow = new Slot([ContentType.Text])
    shadow.insert(code)
    const tokens = tokenize(code, languageGrammar)
    format(tokens, shadow, 0)
    if (slot.blockCommentStart) {
      shadow.retain(2)
      shadow.delete(2)
    }

    slot.retain(0)
    slot.retain(slot.length, codeStyleFormatter, null)

    shadow.getFormats().forEach(i => {
      slot.retain(i.startIndex)
      slot.retain(i.endIndex, i.formatter, i.value)
    })

    const lastToken = tokens.pop()
    slot.blockCommentEnd = !(!!lastToken && typeof lastToken !== 'string' &&
      lastToken.type === 'comment' &&
      (lastToken.content as string).indexOf(commentStartString) === 0)

    const next = list[i + 1]
    if (next) {
      if (!forceFormat && next.blockCommentStart === !slot.blockCommentEnd) {
        break
      }
      next.blockCommentStart = !slot.blockCommentEnd
    }
  }
}

export interface CodeSlotSlotLiteral extends SlotLiteral {
  blockCommentEnt: boolean
  blockCommentStart: boolean
}

export class CodeSlot extends Slot {
  blockCommentEnd = true
  blockCommentStart = false

  constructor() {
    super([
      ContentType.Text
    ])
  }

  override retain(index: number): boolean
  override retain(index: number, formats: Formats): boolean
  override retain(index: number, formatter: Formatter, value: FormatValue | null): boolean
  override retain(index: number, formatter?: any, value?: any): boolean {
    if (formatter && formatter !== codeStyleFormatter) {
      return true
    }
    return super.retain(index, formatter, value)
  }

  override toJSON(): CodeSlotSlotLiteral {
    return {
      ...super.toJSON(),
      blockCommentEnt: this.blockCommentEnd,
      blockCommentStart: this.blockCommentStart
    }
  }
}

export const preComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'PreComponent',
  transform(translator: Translator, state: PreComponentState): PreComponentState {
    return state
  },
  setup(data: PreComponentState) {
    let languageGrammar = getLanguageGrammar(data.lang)
    let [blockCommentStartString] = getLanguageBlockCommentStart(data.lang)

    const stateController = useState(data.lang)
    const injector = useContext()

    const selection = injector.get(TBSelection)

    stateController.onChange.subscribe(newLang => {
      data.lang = newLang
      languageGrammar = getLanguageGrammar(newLang)
      blockCommentStartString = getLanguageBlockCommentStart(newLang)[0]
      isStop = true
      slots.toArray().forEach(i => {
        i.blockCommentStart = false
        i.blockCommentEnd = false
      })
      reformat(slots, slots.get(0)!, languageGrammar!, blockCommentStartString, true)
      isStop = false
    })

    const slotList = formatCodeLines(data.code.split('\n'), false, blockCommentStartString, languageGrammar)
    const slots = useSlots<CodeSlot, CodeSlotSlotLiteral>(slotList, state => {
      const s = new CodeSlot()
      s.blockCommentEnd = state.blockCommentEnt
      return s
    })

    let isStop = false

    slots.onChildSlotChange.subscribe(data => {
      if (languageGrammar && !isStop) {
        isStop = true
        const index = data.source.index
        reformat(slots, data.source, languageGrammar, blockCommentStartString)
        data.source.retain(index)
        isStop = false
      }
    })

    onEnter(ev => {
      const nextSlot = ev.target.cutTo(new CodeSlot, ev.data.index)
      slots.insertAfter(nextSlot, ev.target as CodeSlot)
      selection.setLocation(nextSlot, 0)
      ev.preventDefault()
    })

    onDelete(ev => {
      if (!ev.data.isStart && ev.data.index === ev.target.length && ev.data.count === ev.target.length) {
        slots.remove(ev.target as CodeSlot)
        return
      }
    })

    onContextMenu(() => {
      return languageList.map(i => {
        return {
          label: i.label,
          onClick() {
            if (i.value !== data.lang) {
              stateController.update(i.value)
            }
          }
        }
      })
    })

    onPaste(ev => {
      const codeList = ev.data.text.split('\n')
      const firstCode = codeList.shift()
      const target = ev.target as CodeSlot
      if (firstCode) {
        target.insert(firstCode)
      }
      const index = slots.indexOf(target)
      slots.retain(index + 1)
      const slotList = formatCodeLines(codeList, !target.blockCommentEnd, blockCommentStartString, languageGrammar)
      slots.insert(...slotList)
      ev.preventDefault()
    })

    return {
      render(isOutputMode: boolean, slotRender: SlotRender): VElement {
        const block = new VElement('pre', null, [
          new VElement('div', {
            class: 'tb-code-line-number-bg',
            style: {
              width: Math.max(String(slots.length).length, 2) + 'em'
            }
          }),
          new VElement('div', {
            class: 'tb-code-content'
          }, slots.toArray().map(item => {
            return slotRender(item, () => {
              return new VElement('div', {
                class: 'tb-code-line'
              })
            })
          }))
        ])
        let lang = ''
        languageList.forEach(i => {
          if (i.value === data.lang) {
            lang = i.label
          }
        })
        if (lang) {
          block.appendChild(new VElement('div', {
            class: 'tb-pre-lang'
          }, [new VTextNode(lang)]))
        }
        block.attrs.set('lang', data.lang)
        // block.attrs.set('theme', PreComponent.theme)
        return block
      },
      toJSON(): PreComponentState {
        return {
          lang: data.lang,
          code: slots.toArray().map(i => {
            return i.isEmpty ? '' : i.sliceContent().join('')
          }).join('\n')
        }
      }
    }
  }
})

export const preComponentLoader: ComponentLoader = {
  resources: {
    styles: [`
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
  pre[theme=dark] {color: #a9aeb2; background-color: #1c2838; border-color: #353535 }
  pre[theme=dark] .tb-hl-keyword {color: rgb(0, 134, 179);}
  pre[theme=dark] .tb-hl-tag {color: rgb(0, 134, 179);}
  pre[theme=dark] .tb-hl-comment {color: #4c5156;}
  pre[theme=dark] .tb-hl-string {color: #ce5a70;}
  pre[theme=dark] .tb-hl-attr-value {color: #ce5a70;}
  pre[theme=dark] .tb-hl-regex {color: #af741d;}
  pre[theme=dark] .tb-hl-selector {color: #ce5a70; font-weight: normal}
  pre[theme=dark] .tb-code-line::before { color: #536171}
  pre[theme=dark] .tb-code-line-number-bg {background-color: #2d3a48; border-right-color: #292929; }`]
  },
  match(element: HTMLElement): boolean {
    return element.tagName === 'PRE'
  },
  read(el: HTMLElement, injector: Injector): ComponentInstance {
    const lines = el.querySelectorAll('.tb-code-line')
    let code: string
    if (lines.length) {
      code = Array.from(lines).map(i => (i as HTMLElement).innerText.replace(/[\s\n]+$/, '')).join('\n')
    } else {
      el.querySelectorAll('br').forEach(br => {
        br.parentNode!.replaceChild(document.createTextNode('\n'), br)
      })
      code = el.innerText
    }

    return preComponent.createInstance(injector, {
      lang: el.getAttribute('lang') || '',
      code
    })
  },
  component: preComponent
}
