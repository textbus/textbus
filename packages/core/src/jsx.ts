import { Ref, NativeNode, VElement, jsx } from '@textbus/core'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface Element extends VElement {
    }

    interface IntrinsicElements {
      [name: string]: Element
    }

    interface IntrinsicAttributes {
      ref: Ref<NativeNode>
    }
  }
}

export {
  jsx
}
