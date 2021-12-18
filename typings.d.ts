import { VElement } from '@textbus/core'

declare namespace JSX {
  interface Element extends VElement {}
  interface IntrinsicElements {
    [elemName: string]: Element
  }
}
/* eslint-enable */
declare module 'katex' {
  const Katex: any
  export = Katex
}
