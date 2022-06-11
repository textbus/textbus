// @ts-ignore

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface Element {
      [key: string]: any
    }

    interface IntrinsicElements {
      [name: string]: any
    }

    interface IntrinsicAttributes {
      [key: string]: any
    }
  }
}
