import { NativeRenderer, NativeNode, Injectable } from '@textbus/core'

@Injectable()
export class NodeRenderer extends NativeRenderer {
  createElement(name: string) {
    return {
      tagName: name
    }
  }

  createTextNode(textContent: string) {
    return {
      textContent
    }
  }

  appendChild(): void {
    //
  }

  addClass(): void {
    //
  }

  removeClass(): void {
    //
  }

  setAttribute(): void {
    //
  }

  removeAttribute(): void {
    //
  }

  setStyle(): void {
    //
  }

  syncTextContent() {
    //
  }

  removeStyle(): void {
    //
  }

  replace(): void {
    //
  }

  remove(): void {
    //
  }

  insertBefore(): void {
    //
  }

  getChildByIndex(): NativeNode | null {
    return null
  }

  listen(): void {
    //
  }

  unListen(): void {
    //
  }

  copy(): void {
    //
  }
}
