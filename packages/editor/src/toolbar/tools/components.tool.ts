import { Injector } from '@tanbo/di'
import { Commander, ComponentInstance, ContentType, QueryStateType, Selection, Slot } from '@textbus/core'
import { createElement } from '@textbus/browser'
import { Observable, Subject } from '@tanbo/stream'

import { DropdownTool, DropdownToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { imageCardComponent } from '../../components/image-card.component'
import { todolistComponent, TodoListSlotState } from '../../components/todolist.component'
import { katexComponent } from '../../components/katex.component'
import { wordExplainComponent } from '../../components/word-explain.component'
import { boldFormatter } from '../../formatters/inline-tag.formatter'
import { textAlignFormatter } from '../../formatters/block-style.formatter'
import { timelineComponent } from '../../components/timeline.component'
import { stepComponent } from '../../components/step.component'
import { alertComponent } from '../../components/alert.component'
import { jumbotronComponent } from '../../components/jumbotron.component'

export interface ComponentCreator {
  example: string | HTMLElement;
  name: string;

  factory(injector: Injector): ComponentInstance | Promise<ComponentInstance>;
}

function createViewer(content: string | HTMLElement, name: string) {
  const wrapper = document.createElement('div')
  wrapper.classList.add('textbus-component-example-item')
  const card = document.createElement('div')
  card.classList.add('textbus-component-example')

  const exampleContent = document.createElement('div')
  exampleContent.classList.add('textbus-component-example-content')

  if (typeof content === 'string') {
    exampleContent.innerHTML = content
  } else if (content instanceof HTMLElement) {
    exampleContent.appendChild(content)
  }

  card.appendChild(exampleContent)

  const mask = document.createElement('div')
  mask.classList.add('textbus-component-example-mask')
  card.appendChild(mask)

  wrapper.appendChild(card)
  const nameWrapper = document.createElement('div')
  nameWrapper.classList.add('textbus-component-example-name')
  nameWrapper.innerText = name || ''
  wrapper.appendChild(nameWrapper)
  return {
    wrapper,
    card
  }
}

function createExample(injector: Injector, example: ComponentCreator, controller: Subject<void>) {
  const {wrapper, card} = createViewer(example.example, example.name)
  const commander = injector.get(Commander)
  const selection = injector.get(Selection)

  card.addEventListener('click', () => {
    const t = example.factory(injector)
    if (t instanceof Promise) {
      t.then(instance => {
        commander.insert(instance)
        selection.selectFirstPosition(instance)
        controller.next()
      })
    } else {
      commander.insert(t)
      selection.selectFirstPosition(t)
      controller.next()
    }
  })
  return wrapper
}

export function componentsToolConfigFactory(injector: Injector): DropdownToolConfig {
  const i18n = injector.get(I18n)

  const elementRef = createElement('div', {
    classes: ['textbus-component-stage-list']
  })

  const configs: ComponentCreator[] = [{
    name: i18n.get('components.imageCardComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f90"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="50" width="100%"/></g><g><path fill="#f00" opacity="0.2" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#0e0" opacity="0.3" d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path></g><g><rect fill="#fff" height="20" width="100%" y="50"></rect></g><g><text font-family="Helvetica, Arial, sans-serif" font-size="12" y="63" x="50%" text-anchor="middle" stroke-width="0" stroke="#000" fill="#000000">描述文字</text></g></svg>')}" alt="">`,
    factory() {
      return imageCardComponent.createInstance(injector)
    }
  }, {
    name: i18n.get('components.todoListComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img alt="默认图片" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#fff" stroke="#1296db" height="8" width="8" rx="2" x="15" y="12"/><text font-family="Helvetica, Arial, sans-serif" font-size="8" x="28" y="19"  stroke-width="0" stroke="#000" fill="#000000">待办事项...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 12)"></use><use xlink:href="#item" transform="translate(0, 24)"></use><use xlink:href="#item" transform="translate(0, 36)"></use></svg>')}">`,
    factory() {
      return todolistComponent.createInstance(injector, {
        slots: [
          new Slot<TodoListSlotState>([ContentType.Text, ContentType.InlineComponent], {
            active: false,
            disabled: false
          })
        ]
      })
    }
  }, {
    name: i18n.get('components.jumbotronComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6ad1ec"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="100%" width="100%"/></g><path fill="#fff" opacity="0.3" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#fff" opacity="0.3"  d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path><text font-family="Helvetica, Arial, sans-serif" font-size="12" x="10" y="25" stroke-width="0.3" stroke="#000" fill="#000000">Hello, world!</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="40" stroke-width="0" stroke="#000" fill="#000000">我是 TextBus 富文本编辑器。</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="50" stroke-width="0" stroke="#000" fill="#000000">别来无恙？</text></svg>')}">`,
    factory() {
      return jumbotronComponent.createInstance(injector)
    }
  }, {
    name: i18n.get('components.katexComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40.541"><path d="M4.618 27.925c-.299.299-.591.478-.874.538-.284.06-1.039.105-2.264.135H0v2.062h.493c.508-.09 2.66-.135 6.456-.135 3.796 0 5.948.045 6.456.135h.493v-2.062h-1.48c-1.764-.029-2.765-.209-3.004-.538-.09-.119-.135-1.584-.135-4.394v-4.259l2.062-2.018a83.544 83.544 0 002.063-1.972c.209-.209.388-.373.538-.493l3.901 5.873c2.331 3.587 3.661 5.62 3.99 6.098.09.179.135.359.135.538 0 .778-.688 1.166-2.062 1.166h-.359v2.062h.493c.628-.09 2.764-.135 6.412-.135.269 0 .673.008 1.211.022.538.015.956.022 1.255.022.298 0 .68.008 1.143.022.463.015.807.03 1.031.045.224.015.366.022.426.022h.359v-2.062h-.942c-1.255-.029-2.152-.194-2.69-.493a3.197 3.197 0 01-1.076-1.031l-5.179-7.779c-3.273-4.917-4.91-7.39-4.91-7.42 0-.029 1.33-1.33 3.99-3.901 2.66-2.57 4.065-3.93 4.215-4.08C26.6 2.817 28.379 2.219 30.62 2.1h.628V.037h-.269c-.03 0-.135.008-.314.022-.179.015-.434.03-.762.045a18.99 18.99 0 01-.852.022c-.209 0-.523.008-.942.022-.419.015-.747.022-.986.022-3.408 0-5.366-.045-5.873-.135h-.448v2.062h.179l.202.022.247.022c.836.209 1.255.643 1.255 1.3-.06.24-.12.404-.179.493-.06.12-2.272 2.317-6.636 6.591l-6.546 6.367-.045-6.95c0-4.663.015-7.024.045-7.084.06-.508.897-.762 2.511-.762h2.062V.037h-.493c-.509.09-2.661.135-6.456.135C3.152.172 1 .127.492.037H0v2.062h1.48c1.225.03 1.98.075 2.264.135.284.06.575.24.874.538v25.153zm34.924-16.858h1.793v-.269c.029-.119.074-.478.135-1.076.239-3.198.836-5.201 1.793-6.008.747-.628 1.763-1.046 3.049-1.255.298-.029 1.15-.045 2.556-.045h1.211c.687 0 1.113.022 1.278.067.164.045.291.202.381.471.029.06.045 4.23.045 12.509v12.375c-.24.329-.613.538-1.121.628-1.076.09-2.421.135-4.035.135h-1.345v2.062h.583c.628-.09 3.377-.135 8.25-.135 4.872 0 7.622.045 8.25.135h.583v-2.062h-1.345c-1.614 0-2.959-.045-4.035-.135-.509-.09-.882-.298-1.121-.628V15.461c0-8.279.015-12.449.045-12.509.09-.269.216-.426.381-.471.164-.045.59-.067 1.278-.067h1.211c1.674 0 2.825.075 3.452.224 1.136.329 1.957.807 2.466 1.435.747.867 1.225 2.75 1.435 5.649.06.598.104.957.135 1.076v.269h1.793v-.269c0-.06-.134-1.763-.404-5.111C67.97 2.34 67.82.636 67.791.576v-.27H40.394v.269c0 .06-.135 1.764-.404 5.111-.269 3.348-.419 5.052-.448 5.111v.27zm60.461 19.593v-2.062h-.359c-.658-.06-1.226-.254-1.704-.583-.478-.329-.717-.702-.717-1.121 0-.209.015-.329.045-.359.029-.09 1.031-1.629 3.004-4.618.448-.687.836-1.293 1.166-1.816.329-.523.605-.956.829-1.3.224-.343.411-.62.56-.829.149-.209.254-.343.314-.404l.135-.135 1.659 2.556a514.118 514.118 0 013.273 5.111c1.076 1.704 1.614 2.6 1.614 2.69 0 .209-.314.397-.942.56-.628.165-1.196.247-1.704.247h-.269v2.062h.493c.687-.09 2.869-.135 6.546-.135 3.318 0 5.201.045 5.649.135H120v-2.062h-1.39c-1.166-.029-1.958-.09-2.376-.179-.419-.09-.747-.269-.986-.538-.09-.09-1.667-2.526-4.73-7.308-3.064-4.782-4.596-7.203-4.596-7.263 0-.029.986-1.584 2.959-4.663 2.092-3.139 3.183-4.753 3.273-4.842 1.016-1.046 2.75-1.614 5.201-1.704h.762V.037h-.359c-.359.09-2.003.135-4.932.135-3.468 0-5.396-.045-5.784-.135h-.404v2.062h.359c.926.09 1.614.389 2.062.897.388.389.493.747.314 1.076 0 .03-.778 1.248-2.331 3.654-1.555 2.406-2.347 3.609-2.376 3.609-.06 0-.979-1.397-2.757-4.192-1.779-2.795-2.668-4.237-2.668-4.327.06-.149.404-.306 1.031-.471.628-.164 1.195-.247 1.704-.247h.224V.037h-.493c-.658.09-2.84.135-6.546.135-3.318 0-5.201-.045-5.649-.135h-.404v2.062h1.525c1.614 0 2.69.224 3.228.673.09.09 1.464 2.212 4.125 6.367 2.66 4.155 3.99 6.262 3.99 6.322 0 .03-1.188 1.868-3.564 5.515a2726.32 2726.32 0 01-3.744 5.739c-.957 1.166-2.765 1.793-5.425 1.883h-.763v2.062h.359c.359-.09 2.002-.135 4.932-.135 3.467 0 5.395.045 5.784.135h.448z"/><path d="M37.736 15.499h-3.429c-2.264 0-3.396-.011-3.396-.034l1.715-5.077 1.681-5.043.672 1.984a629.242 629.242 0 011.715 5.077l1.042 3.093zm-6.153 8.573v-1.547h-.168c-.493 0-.958-.095-1.395-.286-.437-.19-.723-.431-.857-.723a.491.491 0 01-.101-.303c0-.134.224-.863.672-2.185l.672-1.984h7.834l.807 2.387c.538 1.614.807 2.443.807 2.488 0 .403-.785.605-2.353.605h-.437v1.547h.336c.336-.067 1.95-.101 4.841-.101 2.51 0 3.934.034 4.27.101h.303v-1.547h-1.009c-1.166-.022-1.872-.146-2.118-.37a1.261 1.261 0 01-.235-.336c-.516-1.591-1.855-5.581-4.018-11.969C37.271 3.461 36.178.256 36.156.233c-.09-.132-.359-.21-.808-.233h-.303c-.359 0-.572.09-.639.269-.023.023-.611 1.754-1.765 5.194a16100.31 16100.31 0 01-5.262 15.65c-.449.874-1.479 1.345-3.093 1.412h-.504v1.547h.235c.269-.067 1.401-.101 3.396-.101 2.174 0 3.463.034 3.866.101h.304zm36.735 13.734c-.299.299-.591.478-.874.538-.284.06-1.039.105-2.264.135H63.7v2.062h26.229v-.135c.06-.09.381-2.085.964-5.986s.889-5.896.919-5.986v-.135h-1.793v.135c-.03.06-.105.464-.224 1.211-.269 1.793-.613 3.244-1.031 4.349-.509 1.375-1.248 2.399-2.219 3.071-.972.673-2.324 1.114-4.058 1.323-.419.03-1.973.045-4.663.045h-2.287c-1.375 0-2.152-.074-2.331-.224-.09-.06-.15-.164-.179-.314-.03-.06-.045-2.107-.045-6.142v-6.008h2.421c1.943.03 3.139.12 3.587.269.836.24 1.405.666 1.704 1.278.298.613.478 1.547.538 2.802v.897h1.793V18.437h-1.793v.897c-.06 1.255-.24 2.19-.538 2.802-.299.613-.867 1.039-1.704 1.278-.448.15-1.644.24-3.587.269h-2.421v-5.425c0-3.646.015-5.499.045-5.56.09-.298.269-.463.538-.493.239-.06 1.853-.09 4.842-.09 1.733 0 2.75.015 3.049.045 2.451.15 4.177.74 5.179 1.771 1.001 1.031 1.681 2.952 2.04 5.761.06.538.104.852.135.942v.179h1.793v-.179c0-.029-.209-1.763-.628-5.201l-.628-5.201v-.179H63.7v2.062h1.48c1.225.03 1.98.075 2.264.135.284.06.575.24.874.538v25.018z"/></svg>')}">`,
    factory() {
      return katexComponent.createInstance(injector, {
        state: {
          source: ''
        }
      })
    }
  }, {
    name: i18n.get('components.wordExplainComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#eee" height="18" width="90" rx="2" x="5" y="6"/><line x1="26" y1="9" x2="26" y2="20.5" stroke="#000" stroke-dasharray="0.8 0.8" stroke-width="0.1"></line><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="14" stroke-width="0" stroke="#000" fill="#000000">名词</text><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="12" y="20" stroke-width="0" stroke="#000" fill="#000000">说明</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="30" y="14" stroke-width="0" stroke="#000" fill="#000000">详细解释...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 20)"></use><use xlink:href="#item" transform="translate(0, 40)"></use></svg>')}">`,
    factory() {
      const {Text, InlineComponent} = ContentType
      const titleSlot = new Slot([Text, InlineComponent])
      const subtitleSlot = new Slot([Text, InlineComponent])
      const detailSlot = new Slot([Text, InlineComponent])
      titleSlot.insert('标题', boldFormatter, true)
      subtitleSlot.insert('副标题')
      titleSlot.applyFormat(textAlignFormatter, 'right')
      subtitleSlot.applyFormat(textAlignFormatter, 'right')
      detailSlot.insert('正文...')
      return wordExplainComponent.createInstance(injector, {
        slots: [
          titleSlot,
          subtitleSlot,
          detailSlot
        ]
      })
    }
  }, {
    name: i18n.get('components.timelineComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><circle r="2" cx="10" cy="12"></circle><line x1="10" y1="12" x2="10" y2="24" stroke-width="0.5"></line><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="16" y="14" stroke-width="0" stroke="#000" fill="#000000">事件主题</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="38" y="13.5" stroke-width="0" stroke="#000" fill="#888">2020-08-08</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="16" y="20" stroke-width="0" stroke="#000" fill="#000000">详细说明...</text></g></defs><use xlink:href="#item" fill="#1296db" stroke="#1296db"></use><use xlink:href="#item" transform="translate(0, 14)" fill="#15bd9a" stroke="#15bd9a"></use><use xlink:href="#item" transform="translate(0, 28)" fill="#495060" stroke="#495060"></use><use xlink:href="#item" transform="translate(0, 42)" fill="#E74F5E" stroke="#E74F5E"></use></svg>')}">`,
    factory() {
      return timelineComponent.createInstance(injector)
    }
  }, {
    name: i18n.get('components.stepsComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><circle r="2" cx="10" cy="12"></circle><line x1="12" y1="12" x2="38" y2="12" stroke-width="0.5"></line><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="8" y="22" stroke-width="0" stroke="#000" fill="#000000">标题</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="8" y="27" stroke-width="0" stroke="#000" fill="#000">描述信息...</text></g></defs><use xlink:href="#item" transform="translate(0, 20)" fill="#15bd9a" stroke="#15bd9a"></use><use xlink:href="#item" transform="translate(30, 20)" fill="#1296db" stroke="#1296db"></use><use xlink:href="#item" transform="translate(60, 20)" fill="#aaa" stroke="#aaa"></use></svg>')}">`,
    factory() {
      return stepComponent.createInstance(injector)
    }
  }, {
    name: i18n.get('components.alertComponent.creator.name'),
    // eslint-disable-next-line max-len
    example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#fff" height="100%" width="100%"/></g><rect width="90%" height="20" fill="#eee" stroke="#dedede" rx="5" ry="5" x="5" y="25"></rect><text font-family="Helvetica, Arial, sans-serif" font-size="10" x="10" y="35" stroke-width="0" stroke="#000" fill="#000000">文本内容</text></svg>')}">`,
    factory() {
      return alertComponent.createInstance(injector)
    }
  }]

  const onComplete = new Subject<void>()
  configs.forEach(i => {
    elementRef.append(createExample(injector, i, onComplete))
  })

  return {
    iconClasses: ['textbus-icon-components'],
    tooltip: i18n.get('plugins.toolbar.components.tooltip'),
    viewController: {
      elementRef,
      onComplete,
      onCancel: new Observable<void>(),
      reset() {
        //
      },
      update() {
        //
      }
    },
    queryState() {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    },

    useValue() {
      //
    }
  }
}

export function componentsTool() {
  return new DropdownTool(componentsToolConfigFactory)
}
