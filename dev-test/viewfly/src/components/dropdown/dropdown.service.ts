import { Injectable } from '@viewfly/core'
import { Observable, Subject } from '@textbus/core'

@Injectable({
  provideIn: 'root'
})
export class DropdownService {
  onSiblingOpen: Observable<number>

  private siblingOpenEvent = new Subject<number>()

  constructor() {
    this.onSiblingOpen = this.siblingOpenEvent.asObservable()
  }

  notify(id: number) {
    this.siblingOpenEvent.next(id)
  }
}
