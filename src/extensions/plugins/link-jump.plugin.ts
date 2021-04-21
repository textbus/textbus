import { Inject, Injectable } from '@tanbo/di';
import { Subscription } from 'rxjs';

import { TBSelection } from '../../lib/core/_api';
import { EDITABLE_DOCUMENT } from '../../lib/inject-tokens';
import { TBPlugin } from '../../lib/plugin';
import { Layout } from '../../lib/ui/layout';
import { I18n } from '../../lib/i18n';

const styles = `
.textbus-link-jump-plugin {
  border-radius: 3px;
  position: absolute;
  line-height: 1em;
  font-size: 12px;
  padding: 6px 0;
  width: 46px;
  text-align: center;
  margin-left: -23px;
  margin-top: -30px;
  background-color: #333;
  color: #ddd;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
  text-decoration: none;
}
.textbus-link-jump-plugin:hover {
  color: #1296db;
}
.textbus-link-jump-plugin:after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  border-width: 6px;
  margin-left: -6px;
  border-style: solid;
  border-color: #333 transparent transparent;
  pointer-events: none;
}
`

@Injectable()
export class LinkJumpPlugin implements TBPlugin {
  private link = document.createElement('a');

  private style = document.createElement('style');

  private subs: Subscription[] = [];

  constructor(private selection: TBSelection,
              private layout: Layout,
              private i18n: I18n,
              @Inject(EDITABLE_DOCUMENT) private contentDocument: Document) {
    this.subs.push(
      this.selection.onChange.subscribe(() => {
        this.onSelectionChange();
      })
    )
  }

  setup() {
    this.link.innerText = this.i18n.get('plugins.linkJump.accessLink');
    this.link.target = '_blank';
    this.link.className = 'textbus-link-jump-plugin';
    this.style.innerHTML = styles;
    document.head.appendChild(this.style);
  }

  onDestroy() {
    this.style.parentNode?.removeChild(this.style);
    this.subs.forEach(i => i.unsubscribe());
  }

  private onSelectionChange() {
    const nativeSelection = this.contentDocument.getSelection();
    const firstNativeRange = nativeSelection.rangeCount ? nativeSelection.getRangeAt(0) : null;
    if (firstNativeRange) {
      const focusNode = firstNativeRange.commonAncestorContainer;
      if (focusNode) {
        const container = (focusNode.nodeType === Node.TEXT_NODE ? focusNode.parentNode : focusNode) as HTMLElement;
        const linkElement = this.getLinkByDOMTree(container);
        if (linkElement && (linkElement.href || linkElement.dataset.href)) {
          this.link.href = linkElement.href || linkElement.dataset.href;
          const rect = this.selection.firstRange.getRangePosition();
          Object.assign(this.link.style, {
            left: (rect.left + rect.right) / 2 + 'px',
            top: rect.top + 'px'
          })
          if (!this.link.parentNode) {
            this.layout.docContainer.appendChild(this.link);
          }
          return;
        }
      }
    }

    this.link.parentNode?.removeChild(this.link);
  }


  private getLinkByDOMTree(node: HTMLElement): HTMLLinkElement | null {
    if (node instanceof HTMLElement) {
      if (node.tagName.toLowerCase() === 'a') {
        return node as HTMLLinkElement;
      }
      if (node.parentNode) {
        return this.getLinkByDOMTree(node.parentNode as HTMLElement);
      }
    }
    return null;
  }
}
