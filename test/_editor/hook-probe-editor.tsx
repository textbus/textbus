import {
  Module,
  Textbus,
  TextbusConfig,
  onBlur,
  onBreak,
  onCompositionEnd,
  onCompositionStart,
  onCompositionUpdate,
  onContentDelete,
  onContentDeleted,
  onContentInsert,
  onContentInserted,
  onContextMenu,
  onDetach,
  onFocus,
  onFocusIn,
  onFocusOut,
  onGetRanges,
  onParentSlotUpdated,
  onPaste,
  onSelected,
  onSelectionFromEnd,
  onSelectionFromFront,
  onSlotApplyFormat,
  onSlotSetAttribute,
  onUnselect
} from '@textbus/core'
import { BrowserModule, DomAdapter } from '@textbus/platform-browser'
import { ViewflyAdapter, ViewflyVDomAdapter } from '@textbus/adapter-viewfly'
import { createApp, HTMLRenderer, OutputTranslator } from '@viewfly/platform-browser'
import { ReflectiveInjector } from '@viewfly/core'

import { RootComponent, RootComponentView } from './components/root.component'
import { ParagraphComponent, ParagraphComponentView } from './components/paragraph.component'
import { InlineComponent, InlineComponentView } from './components/inline.component'
import { boldFormatter } from './formatters/bold.formatter'
import { fontSizeFormatter } from './formatters/font-size.formatter'
import { textAlignAttribute } from './attributes/text-align.attribute'

/** 与当前用例共享的日志数组，在 spec 的 beforeEach 中 `hookProbeLog.length = 0` */
export const hookProbeLog: string[] = []

function registerSlotHooks(prefix: string) {
  onBreak(() => hookProbeLog.push(`${prefix}:onBreak`))
  onContentInsert(() => hookProbeLog.push(`${prefix}:onContentInsert`))
  onContentInserted(() => hookProbeLog.push(`${prefix}:onContentInserted`))
  onContentDelete(() => hookProbeLog.push(`${prefix}:onContentDelete`))
  onContentDeleted(() => hookProbeLog.push(`${prefix}:onContentDeleted`))
  onPaste(() => hookProbeLog.push(`${prefix}:onPaste`))
  onContextMenu(ev => {
    hookProbeLog.push(`${prefix}:onContextMenu`)
    ev.useMenus([])
  })
  onGetRanges(() => hookProbeLog.push(`${prefix}:onGetRanges`))
  onCompositionStart(() => hookProbeLog.push(`${prefix}:onCompositionStart`))
  onCompositionUpdate(() => hookProbeLog.push(`${prefix}:onCompositionUpdate`))
  onCompositionEnd(() => hookProbeLog.push(`${prefix}:onCompositionEnd`))
  onSlotSetAttribute(() => hookProbeLog.push(`${prefix}:onSlotSetAttribute`))
  onSlotApplyFormat(() => hookProbeLog.push(`${prefix}:onSlotApplyFormat`))
}

function registerLifecycleHooks(prefix: string) {
  onDetach(() => hookProbeLog.push(`${prefix}:onDetach`))
  onParentSlotUpdated(() => hookProbeLog.push(`${prefix}:onParentSlotUpdated`))
  onSelected(() => hookProbeLog.push(`${prefix}:onSelected`))
  onUnselect(() => hookProbeLog.push(`${prefix}:onUnselect`))
  onFocus(() => hookProbeLog.push(`${prefix}:onFocus`))
  onBlur(() => hookProbeLog.push(`${prefix}:onBlur`))
  onFocusIn(() => hookProbeLog.push(`${prefix}:onFocusIn`))
  onFocusOut(() => hookProbeLog.push(`${prefix}:onFocusOut`))
  onSelectionFromFront(() => hookProbeLog.push(`${prefix}:onSelectionFromFront`))
  onSelectionFromEnd(() => hookProbeLog.push(`${prefix}:onSelectionFromEnd`))
}

export class HookProbeRootComponent extends RootComponent {
  override setup() {
    registerSlotHooks('root')
    registerLifecycleHooks('root')
  }
}

export class HookProbeParagraphComponent extends ParagraphComponent {
  override setup() {
    registerSlotHooks('paragraph')
    registerLifecycleHooks('paragraph')
  }
}

/** 仅额外验证视图更新路径上的 onParentSlotUpdated */
/**
 * 与 {@link Editor} 相同配置，但 Root / Paragraph 使用带 setup 钩子的实现。
 */
export class HookProbeEditor extends Textbus {
  translator = new OutputTranslator()
  private vDomAdapter: ViewflyVDomAdapter

  constructor(host: HTMLElement, config: TextbusConfig = {}, modules: Module[] = []) {
    const adapter = new ViewflyAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [InlineComponent.componentName]: InlineComponentView
    }, (hostEl, root, textbus) => {
      const app = createApp(root, {
        context: textbus
      })
      app.mount(hostEl)
      return () => {
        app.destroy()
      }
    })
    const browserModule = new BrowserModule({
      adapter,
      renderTo(): HTMLElement {
        return host
      }
    })

    const vDomAdapter = new ViewflyVDomAdapter({
      [RootComponent.componentName]: RootComponentView,
      [ParagraphComponent.componentName]: ParagraphComponentView,
      [InlineComponent.componentName]: InlineComponentView
    } as any, (hostEl, root, injector) => {
      const appInjector = new ReflectiveInjector(injector, [{
        provide: DomAdapter,
        useFactory: () => vDomAdapter
      }])
      const app = createApp(root, {
        context: appInjector,
        nativeRenderer: new HTMLRenderer()
      }).mount(hostEl)
      return () => {
        app.destroy()
      }
    })

    super({
      imports: [browserModule, ...modules],
      additionalAdapters: [vDomAdapter],
      components: [
        HookProbeRootComponent,
        HookProbeParagraphComponent,
        InlineComponent
      ],
      formatters: [boldFormatter, fontSizeFormatter],
      attributes: [textAlignAttribute],
      ...config
    })

    this.vDomAdapter = vDomAdapter
  }

  getHTML() {
    return this.translator.transform(this.vDomAdapter.host)
  }
}
