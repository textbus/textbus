import { ContentType, defineComponent, VElement } from '@textbus/core'

export function createUnknownComponent(factoryName: string, canInsertInlineComponent: boolean) {
  const unknownComponent = defineComponent({
    type: canInsertInlineComponent ? ContentType.InlineComponent : ContentType.BlockComponent,
    name: 'UnknownComponent',
    setup() {
      console.error(`cannot find component factory \`${factoryName}\`.`)
      return {
        render() {
          return VElement.createElement('textbus-unknown-component', {
            style: {
              display: canInsertInlineComponent ? 'inline' : 'block',
              color: '#f00'
            }
          }, unknownComponent.name)
        }
      }
    }
  })
  return unknownComponent
}
