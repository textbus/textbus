import { Injector } from '@tanbo/di'
import {
  Commander,
  ComponentInstance,
  ContentType,
  QueryState,
  Query,
  QueryStateType,
  Selection,
  Translator
} from '@textbus/core'
import { blockComponent, headingComponent, paragraphComponent } from '../../components/_api'

import { SelectTool, SelectToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'

export function headingToolConfigFactory(injector: Injector): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const selection = injector.get(Selection)
  const translator = injector.get(Translator)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.headingTool.tooltip'),
    options: [{
      label: i18n.get('plugins.toolbar.headingTool.h1'),
      classes: ['textbus-toolbar-h1'],
      value: 'h1',
      keymap: {
        ctrlKey: true,
        key: '1'
      }
    }, {
      label: i18n.get('plugins.toolbar.headingTool.h2'),
      classes: ['textbus-toolbar-h2'],
      value: 'h2',
      keymap: {
        ctrlKey: true,
        key: '2'
      }
    }, {
      label: i18n.get('plugins.toolbar.headingTool.h3'),
      classes: ['textbus-toolbar-h3'],
      value: 'h3',
      keymap: {
        ctrlKey: true,
        key: '3'
      }
    }, {
      label: i18n.get('plugins.toolbar.headingTool.h4'),
      classes: ['textbus-toolbar-h4'],
      value: 'h4',
      keymap: {
        ctrlKey: true,
        key: '4'
      }
    }, {
      label: i18n.get('plugins.toolbar.headingTool.h5'),
      classes: ['textbus-toolbar-h5'],
      value: 'h5',
      keymap: {
        ctrlKey: true,
        key: '5'
      }
    }, {
      label: i18n.get('plugins.toolbar.headingTool.h6'),
      classes: ['textbus-toolbar-h6'],
      value: 'h6',
      keymap: {
        ctrlKey: true,
        key: '6'
      }
    }, {
      label: i18n.get('plugins.toolbar.headingTool.paragraph'),
      value: 'p',
      default: true,
      keymap: {
        ctrlKey: true,
        key: '0'
      }
    }],
    queryState(): QueryState<string> {
      const headingState = query.queryComponent(headingComponent)
      if (headingState.state === QueryStateType.Enabled) {
        return {
          state: QueryStateType.Enabled,
          value: headingState.value!.methods.type!
        }
      }
      const paragraphState = query.queryComponent(paragraphComponent)
      return {
        state: paragraphState.state,
        value: paragraphState.state === QueryStateType.Enabled ? 'p' : null
      }
    },
    onChecked(value: string) {
      const names = [
        paragraphComponent.name,
        headingComponent.name,
      ]

      selection.getBlocks().reverse().map(block => {
        const parent = block.slot.parent!

        const currentSlot = block.slot
        const isSingleBlock = names.includes(parent.name)
        const isBlockContainer = currentSlot.schema.includes(ContentType.BlockComponent)

        if (!isSingleBlock && !isBlockContainer) {
          return
        }

        const slot = translator.createSlot(currentSlot.toJSON()).cut(block.startIndex, block.endIndex)

        let component: ComponentInstance
        if (/h[1-6]/.test(value)) {
          component = headingComponent.createInstance(injector, {
            state: value,
            slots: [slot]
          })
        } else if (value === 'p') {
          component = paragraphComponent.createInstance(injector, {
            slots: [slot]
          })
        } else {
          component = blockComponent.createInstance(injector, {
            slots: [slot]
          })
        }

        const length = currentSlot.length
        if (block.startIndex === 0 && block.endIndex === length) {
          if (isSingleBlock || isBlockContainer) {
            if (isSingleBlock) {
              commander.replace(parent, component)
            } else {
              currentSlot.retain(0)
              currentSlot.delete(length)
              currentSlot.insert(component)
            }
            if (block.slot === selection.startSlot) {
              selection.setStart(slot, selection.startOffset!)
            }
            if (block.slot === selection.endSlot) {
              selection.setEnd(slot, selection.endOffset!)
            }
          }
        } else if (isBlockContainer) {
          currentSlot.retain(block.startIndex)
          currentSlot.delete(block.endIndex - block.startIndex)
          currentSlot.insert(component)
          if (block.slot === selection.startSlot && block.startIndex <= selection.startOffset!) {
            selection.setStart(slot, selection.startOffset! - block.startIndex)
          }
          if (block.slot === selection.endSlot && block.endIndex >= selection.endOffset!) {
            selection.setEnd(slot, selection.endOffset! - block.startIndex)
          }
        }
      })
    }
  }
}

export function headingTool() {
  return new SelectTool(headingToolConfigFactory)
}
