/* eslint-disable */
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
/* eslint-enable */
declare module 'katex' {
  const Katex: any
  export = Katex
}
