import { fromEvent } from '@tanbo/stream'
import { CompositionStartEventData, CompositionUpdateEventData, Event, invokeListener, Slot } from '@textbus/core'
import { Injectable } from '@viewfly/core'

import { NativeInput } from './native-input'

interface TextDiff {
  index: number
  old: string
  new: string
}

function diffText(oldText: string, newText: string): TextDiff {
  let start = 0
  const oldLength = oldText.length
  const newLength = newText.length

  while (start < oldLength && start < newLength) {
    if (oldText.charAt(start) === newText.charAt(start)) {
      start++
      continue
    }
    break
  }

  let endOffset = 0
  while (true) {
    if (oldLength - endOffset <= start || newLength - endOffset <= start) {
      break
    }
    if (oldText.charAt(oldLength - endOffset - 1) === newText.charAt(newLength - endOffset - 1)) {
      endOffset++
    } else {
      break
    }
  }

  return {
    index: start,
    old: oldText.slice(start, oldLength - endOffset),
    new: newText.slice(start, newLength - endOffset),
  }
}

@Injectable()
export class NativeMutationInput extends NativeInput {
  override handleInput(view: HTMLElement) {
    let isStart = false
    let isEnd = false
    let startValue = ''
    let isComposition = false
    fromEvent(view, 'compositionstart').subscribe(() => {
      console.log('----start')
      isStart = true
      isEnd = false
      this.composition = true
      isComposition = true
    }).add(
      fromEvent(view, 'compositionend').subscribe(() => {
        console.log('----end')
        isEnd = true
        this.composition = false
      })
    )

    const applyDiff = (diff: TextDiff) => {
      if (diff.old.length) {
        this.commander.delete()
      }
      this.commander.write(diff.new)
    }
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          // console.log(mutation.oldValue!, mutation.target.nodeValue!)
          if (isComposition) {
            if (isStart) {
              console.log(111)
              isStart = false
              startValue = mutation.oldValue || ''
              const startSlot = this.selection.startSlot!
              const event = new Event<Slot, CompositionStartEventData>(startSlot, {
                index: this.selection.startOffset!
              })
              invokeListener(startSlot.parent!, 'onCompositionStart', event)
              return
            }
            if (isEnd) {

              console.log(222)
              // const location = this.domAdapter.getLocationByNativeNode(mutation.target)
              const diff = diffText(startValue, mutation.target.nodeValue!)
              startValue = ''
              isEnd = false
              isComposition = false
              applyDiff(diff)
              const startSlot = this.selection.startSlot
              if (startSlot) {
                const event = new Event<Slot>(startSlot, null)
                invokeListener(startSlot.parent!, 'onCompositionEnd', event)
              }
              break
            } else {

              console.log(333)
              const startSlot = this.selection.startSlot!
              const event = new Event<Slot, CompositionUpdateEventData>(startSlot, {
                index: this.selection.startOffset!,
                data: diffText(startValue, mutation.target.nodeValue!).new
              })

              invokeListener(startSlot.parent!, 'onCompositionUpdate', event)
            }
          } else {

            console.log(444)
            // const location = this.domAdapter.getLocationByNativeNode(mutation.target)
            const diff = diffText(mutation.oldValue!, mutation.target.nodeValue!)
            applyDiff(diff)
            const startSlot = this.selection.startSlot
            if (startSlot) {
              const event = new Event<Slot>(startSlot, null)
              invokeListener(startSlot.parent!, 'onCompositionEnd', event)
            }
          }
        }
      }
    })

    observer.observe(view, {
      subtree: true,
      characterData: true,
      characterDataOldValue: true
    })
  }
}
