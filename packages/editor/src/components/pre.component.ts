import { Injector } from '@tanbo/di'
import {
  ComponentData,
  ComponentInstance,
  ContentType,
  defineComponent,
  Formatter,
  FormatType,
  onContextMenu,
  onEnter,
  onPaste,
  Selection,
  Slot,
  SlotLiteral,
  SlotRender,
  Slots,
  useContext, useSelf,
  useSlots,
  useState,
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
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import { paragraphComponent } from './paragraph.component'
import { I18n } from '../i18n'

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

export const languageList: Array<{ label: string, value: string }> = [{
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
  label: 'Jsx',
  value: 'Jsx',
}, {
  label: 'Tsx',
  value: 'Tsx',
}, {
  label: '',
  value: '',
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
    CSharp: ['/*', '*/'],
    Tsx: ['/*', '*/'],
    Jsx: ['/*', '*/']
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
    CSharp: languages.csharp,
    Jsx: languages.jsx,
    Tsx: languages.tsx
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

function formatCodeLines(
  lines: string[],
  startBlock: boolean,
  blockCommentStartString: string,
  blockCommentEndString: string,
  languageGrammar: Grammar | null) {
  return lines.map(i => {
    const slot = createCodeSlot()
    slot.state.blockCommentStart = startBlock
    if (slot.state.blockCommentStart) {
      i = blockCommentStartString + i
    }
    slot.insert(i)
    if (languageGrammar) {
      const tokens = tokenize(i, languageGrammar)
      format(tokens, slot, 0)
      if (slot.state.blockCommentStart) {
        slot.retain(0)
        slot.delete(2)
      }
      const lastToken = tokens.pop()

      if (lastToken && typeof lastToken !== 'string' &&
        lastToken.type === 'comment' &&
        (lastToken.content as string).indexOf(blockCommentStartString) === 0) {
        const regString = blockCommentEndString.replace(new RegExp(`[${blockCommentEndString}]`, 'g'), i => '\\' + i)
        slot.state.blockCommentEnd = new RegExp(regString + '$').test(lastToken.content as string)
        startBlock = !slot.state.blockCommentEnd
      } else {
        startBlock = false
      }

      // startBlock = !!lastToken && typeof lastToken !== 'string' &&
      //   lastToken.type === 'comment' &&
      //   (lastToken.content as string).indexOf(blockCommentStartString) === 0
      // slot.blockCommentEnd = !startBlock
    } else {
      slot.state.blockCommentEnd = true
    }
    return slot
  })
}

function reformat(
  slots: Slots,
  startSlot: Slot,
  languageGrammar: Grammar,
  blockCommentStartString: string,
  blockCommentEndString: string,
  forceFormat = false) {
  const list = slots.toArray()
  let i = list.indexOf(startSlot)
  // if (list[0]) {
  //   list[0].blockCommentStart = startSlot.blockCommentEnd
  // }
  for (; i < list.length; i++) {
    const slot = list[i]
    let code = slot.sliceContent()[0] as string
    if (slot.state.blockCommentStart) {
      code = blockCommentStartString + code
    }

    const shadow = new Slot([ContentType.Text])
    shadow.insert(code)
    const tokens = tokenize(code, languageGrammar)
    format(tokens, shadow, 0)
    if (slot.state.blockCommentStart) {
      shadow.retain(0)
      shadow.delete(2)
    }

    slot.retain(0)
    slot.retain(slot.length, codeStyleFormatter, null)

    shadow.getFormats().forEach(i => {
      slot.retain(i.startIndex)
      slot.retain(i.endIndex, i.formatter, i.value)
    })

    const lastToken = tokens.pop()
    if (lastToken && typeof lastToken !== 'string' &&
      lastToken.type === 'comment' &&
      (lastToken.content as string).indexOf(blockCommentStartString) === 0) {
      const regString = blockCommentEndString.replace(new RegExp(`[${blockCommentEndString}]`, 'g'), i => '\\' + i)
      slot.state.blockCommentEnd = new RegExp(regString + '$').test(lastToken.content as string)
    } else {
      slot.state.blockCommentEnd = true
    }

    const next = list[i + 1]
    if (next) {
      if (!forceFormat && next.state.blockCommentStart === !slot.state.blockCommentEnd) {
        break
      }
      next.state.blockCommentStart = !slot.state.blockCommentEnd
    }
  }
}

export interface CodeSlotSlotLiteral extends SlotLiteral {
  blockCommentEnd: boolean
  blockCommentStart: boolean
}

function createCodeSlot() {
  const slot = new Slot([
    ContentType.Text
  ], {
    blockCommentEnd: true,
    blockCommentStart: false
  })
  return overrideSlot(slot)
}

function overrideSlot(slot: Slot) {
  const retain = slot.retain

  slot.retain = function (index: number, formatter: any, value: any) {
    if (formatter && formatter !== codeStyleFormatter) {
      return true
    }
    return retain.call(slot, index, formatter, value)
  } as any
  return slot
}

export const preComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'PreComponent',
  setup(data: ComponentData<PreComponentState>) {
    let languageGrammar = getLanguageGrammar(data.state!.lang)
    let [blockCommentStartString, blockCommentEndString] = getLanguageBlockCommentStart(data.state!.lang)

    const self = useSelf()

    self.toJSON = function () {
      return {
        name: self.name,
        state: {
          lang: data.state?.lang,
          code: slots.toArray().map(i => {
            return i.isEmpty ? '' : i.sliceContent().join('')
          }).join('\n')
        },
        slots: []
      }
    }

    const stateController = useState({
      lang: data.state!.lang
    })
    const injector = useContext()

    const i18n = injector.get(I18n)

    const selection = injector.get(Selection)

    stateController.onChange.subscribe(newLang => {
      data.state!.lang = newLang.lang
      languageGrammar = getLanguageGrammar(newLang.lang);

      [blockCommentStartString, blockCommentEndString] = getLanguageBlockCommentStart(newLang.lang)
      isStop = true
      slots.toArray().forEach(i => {
        i.state.blockCommentStart = false
        i.state.blockCommentEnd = false
      })
      if (!languageGrammar) {
        slots.toArray().forEach(i => {
          i.retain(0)
          i.retain(i.length, codeStyleFormatter, null)
        })
      } else {
        reformat(slots, slots.get(0)!, languageGrammar!, blockCommentStartString, blockCommentEndString, true)
      }
      isStop = false
    })

    const slotList = formatCodeLines(data.state!.code.split('\n'), false, blockCommentStartString, blockCommentEndString, languageGrammar)
    const slots = useSlots(slotList)

    let isStop = false

    slots.onChildSlotChange.subscribe(data => {
      if (languageGrammar && !isStop) {
        isStop = true
        const index = data.source.index
        reformat(slots, data.source, languageGrammar, blockCommentStartString, blockCommentEndString)
        data.source.retain(index)
        isStop = false
      }
    })

    onEnter(ev => {
      if (ev.target.isEmpty && ev.target === slots.last) {
        const prevSlot = slots.get(slots.length - 2)
        if (prevSlot?.isEmpty) {
          const paragraph = paragraphComponent.createInstance(injector)
          const parentComponent = selection.commonAncestorComponent!
          const parentSlot = parentComponent.parent!
          const index = parentSlot.indexOf(parentComponent)
          parentSlot.retain(index + 1)
          slots.remove(slots.last)
          if (slots.length > 1) {
            slots.remove(prevSlot)
          }
          parentSlot.insert(paragraph)
          selection.setLocation(paragraph.slots.get(0)!, 0)
          ev.preventDefault()
          return
        }
      }
      const nextSlot = ev.target.cutTo(createCodeSlot(), ev.data.index)
      slots.insertAfter(nextSlot, ev.target as Slot)
      if (languageGrammar && !isStop) {
        isStop = true
        const index = nextSlot.index
        reformat(slots, nextSlot, languageGrammar, blockCommentStartString, blockCommentEndString)
        nextSlot.retain(index)
        isStop = false
      }
      selection.setLocation(nextSlot, 0)
      ev.preventDefault()
    })

    onContextMenu(() => {
      return [{
        iconClasses: ['textbus-icon-terminal'],
        label: i18n.get('components.preComponent.contextMenuLabel'),
        submenu: languageList.map(i => {
          return {
            label: i.label || i18n.get('components.preComponent.defaultLang'),
            onClick() {
              if (i.value !== data.state!.lang) {
                data.state!.lang = i.value
                stateController.update(draft => {
                  draft.lang = i.value
                })
              }
            }
          }
        })
      }]
    })

    onPaste(ev => {
      const codeList = ev.data.text.split('\n')
      const firstCode = codeList.shift()
      const target = ev.target
      if (firstCode) {
        target.insert(firstCode)
      }
      const index = slots.indexOf(target)
      if (codeList.length) {
        slots.retain(index + 1)
        const slotList = formatCodeLines(codeList, !target.state.blockCommentEnd, blockCommentStartString, blockCommentEndString, languageGrammar)
        const last = slotList[slotList.length - 1]
        slots.insert(...slotList)
        selection.setLocation(last, last.index)
      } else {
        selection.setLocation(target, target.index)
      }
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
          if (i.value === data.state!.lang) {
            lang = i.label
          }
        })
        if (lang) {
          block.appendChild(new VElement('span', {
            class: 'tb-pre-lang'
          }, [new VTextNode(lang)]))
        }
        block.attrs.set('lang', data.state!.lang)
        // block.attrs.set('theme', PreComponent.theme)
        return block
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
   .tb-code-line { position: relative; display: block}
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
      state: {
        lang: el.getAttribute('lang') || '',
        code
      }
    })
  },
  component: preComponent
}
