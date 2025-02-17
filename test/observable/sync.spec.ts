import { ContentType, NativeSelectionBridge, RootComponentRef, Slot } from '@textbus/core'
import { NodeSelectionBridge } from '@textbus/platform-node'
import { Collaborate, CollaborateModule, SyncConnector } from '@textbus/collaborate'
import { Map as YMap, Text as YText } from 'yjs'

import { Editor } from '../_editor/editor'
import { RootComponent } from '../_editor/components/root.component'
import { sleep } from '../util'

class MockSyncConnector extends SyncConnector {
  constructor() {
    super()
    Promise.resolve().then(() => {
      this.loadEvent.next()
    })
  }
  override setLocalStateField() {
    //
  }

  override onDestroy() {
    //
  }
}

describe('ObservableSync', () => {
  let editor!: Editor

  beforeEach(async () => {
    editor = new Editor(document.body, {
      providers: [
        {
          provide: NativeSelectionBridge,
          useClass: NodeSelectionBridge
        }
      ]
    }, [new CollaborateModule({
      createConnector(): SyncConnector {
        return new MockSyncConnector()
      }
    })])
    const root = new RootComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })

  test('数据绑定', async () => {
    const root = editor.get(RootComponentRef).component as RootComponent
    const yDoc = editor.get(Collaborate).yDoc

    const yMap = yDoc.get('RootComponent') as YMap<any>

    const sharedRootState = yMap.get('state') as YMap<any>
    const sharedRootSlot = sharedRootState.get('slot') as YText
    expect(sharedRootSlot).toBeInstanceOf(YText)

    const sharedSlotContent = sharedRootSlot.toDelta()[0].insert as YText

    expect(sharedSlotContent).toBeInstanceOf(YText)

    root.state.slot.insert('text')
    await sleep()
    expect(sharedSlotContent.toDelta()).toStrictEqual([{
      insert: 'text'
    }])
  })

  test('数据解绑', () => {
    const root = editor.get(RootComponentRef).component as RootComponent
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    root.changeMarker.addDetachCallback(fn1)
    root.state.slot.__changeMarker__.addDetachCallback(fn2)
    editor.destroy()
    expect(fn1).toBeCalledTimes(1)
    expect(fn2).toBeCalledTimes(1)
  })
})
