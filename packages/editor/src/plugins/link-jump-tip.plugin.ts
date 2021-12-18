import { Subscription } from '@tanbo/stream'
import { NativeSelectionBridge, TBSelection } from '@textbus/core'
import { Injector, Type } from '@tanbo/di'
import { EDITABLE_DOCUMENT, EDITOR_CONTAINER, TBPlugin } from '@textbus/browser'
import { I18n } from '../i18n'

export class LinkJumpTipPlugin implements TBPlugin {
  private link = document.createElement('a')
  private subs: Subscription[] = []

  setup(injector: Injector) {
    const selection = injector.get(TBSelection)
    const nativeSelectionBridge = injector.get(NativeSelectionBridge as Type<NativeSelectionBridge>)
    const container = injector.get(EDITOR_CONTAINER)
    const i18n = injector.get(I18n)
    const contentDocument = injector.get(EDITABLE_DOCUMENT)
    this.link.innerText = i18n.get('plugins.linkJump.accessLink') || '跳转'
    this.link.target = '_blank'
    this.link.className = 'textbus-link-jump-plugin'
    this.subs.push(
      selection.onChange.subscribe(() => {
        this.onSelectionChange(contentDocument, selection, nativeSelectionBridge, container)
      })
    )
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private onSelectionChange(contentDocument: Document, selection: TBSelection, bridge: NativeSelectionBridge, container: HTMLElement) {
    const nativeSelection = contentDocument.getSelection()!
    const firstNativeRange = nativeSelection.rangeCount ? nativeSelection.getRangeAt(0) : null
    if (firstNativeRange) {
      const focusNode = firstNativeRange.commonAncestorContainer
      if (focusNode) {
        const node = (focusNode.nodeType === Node.TEXT_NODE ? focusNode.parentNode : focusNode) as HTMLElement
        const linkElement = this.getLinkByDOMTree(node)
        if (linkElement && (linkElement.href || linkElement.dataset.href)) {
          this.link.href = linkElement.href || linkElement.dataset.href || ''
          const rect = bridge.getRect({
            slot: selection.startSlot!,
            offset: selection.startOffset!
          })!
          if (nativeSelection.isCollapsed) {
            Object.assign(this.link.style, {
              left: rect.left + 'px',
              top: rect.top + 'px'
            })
          } else {
            const rect2 = bridge.getRect({
              slot: selection.endSlot!,
              offset: selection.endOffset!
            })!
            Object.assign(this.link.style, {
              left: (rect.left + rect2.left) / 2 + 'px',
              top: rect.top + 'px'
            })
          }

          if (!this.link.parentNode) {
            container.appendChild(this.link)
          }
          return
        }
      }
    }

    this.link.parentNode?.removeChild(this.link)
  }


  private getLinkByDOMTree(node: HTMLElement): HTMLLinkElement | null {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName.toLowerCase() === 'a') {
        return node as HTMLLinkElement
      }
      if (node.parentNode) {
        return this.getLinkByDOMTree(node.parentNode as HTMLElement)
      }
    }
    return null
  }
}
