import { Injectable } from '@viewfly/core'
import { Subject } from '@textbus/core'

@Injectable({
  provideIn: 'root'
})
export class EditorService {
  hideInlineToolbar = false
  canShowLeftToolbar = true
  onLeftToolbarCanVisibleChange = new Subject<void>()

  changeLeftToolbarVisible(b: boolean) {
    this.canShowLeftToolbar = b
    this.onLeftToolbarCanVisibleChange.next()
  }
}
