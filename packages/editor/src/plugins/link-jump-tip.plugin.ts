import { delay, Subscription } from '@tanbo/stream'
import { NativeSelectionBridge, Selection, Plugin } from '@textbus/core'
import { Injector } from '@tanbo/di'
import { VIEW_CONTAINER } from '@textbus/browser'
import { I18n } from '../i18n'

export class LinkJumpTipPlugin implements Plugin {
  private link = document.createElement('a')
  private subs: Subscription[] = []

  setup(injector: Injector) {
    const selection = injector.get(Selection)
    const nativeSelectionBridge = injector.get(NativeSelectionBridge)
    const container = injector.get(VIEW_CONTAINER)
    const i18n = injector.get(I18n)
    this.link.innerText = i18n.get('plugins.linkJump.accessLink') || '跳转'
    this.link.target = '_blank'
    this.link.className = 'textbus-link-jump-plugin'
    this.subs.push(
      selection.onChange.pipe(delay()).subscribe(() => {
        this.onSelectionChange(document, selection, nativeSelectionBridge, container)
      })
    )
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }

  private onSelectionChange(contentDocument: Document, selection: Selection, bridge: NativeSelectionBridge, container: HTMLElement) {
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

          const offsetRect = container.getBoundingClientRect()
          if (nativeSelection.isCollapsed) {
            Object.assign(this.link.style, {
              left: rect.left - offsetRect.left + 'px',
              top: rect.top - offsetRect.top + 'px'
            })
          } else {
            const rect2 = bridge.getRect({
              slot: selection.endSlot!,
              offset: selection.endOffset!
            })!
            Object.assign(this.link.style, {
              left: (rect.left + rect2.left) / 2 - offsetRect.left + 'px',
              top: rect.top - offsetRect.top + 'px'
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
