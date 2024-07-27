import { Injectable, InjectFlags, Injector } from '@viewfly/core'
import { Observable, Subject } from '@textbus/core'

import { DropdownService } from './dropdown.service'

let i = 0

@Injectable()
export class DropdownContextService {
  id = i
  isOpen = false
  onOpenStateChange: Observable<boolean>
  canHide = true
  private openStateChangeEvent = new Subject<boolean>()

  private timer: any = null
  private parentDropdownContextService = this.injector.get(DropdownContextService, null, InjectFlags.SkipSelf)

  constructor(private dropdownService: DropdownService,
              private injector: Injector) {
    this.onOpenStateChange = this.openStateChangeEvent.asObservable()
    dropdownService.onSiblingOpen.subscribe(id => {
      if (id === this.id) {
        return
      }

      this.isOpen = false
      this.openStateChangeEvent.next(false)
    })
    i++
  }

  open() {
    this.isOpen = true
    clearTimeout(this.timer)
    this.timer = null
    this.openStateChangeEvent.next(true)
    this.dropdownService.notify(this.id)
    if (this.parentDropdownContextService) {
      this.parentDropdownContextService.open()
    }
  }

  hide(delay = true) {
    if (!this.canHide) {
      return
    }
    if (this.parentDropdownContextService) {
      this.parentDropdownContextService.hide()
    }

    if (delay) {
      this.timer = setTimeout(() => {
        this.isOpen = false
        this.openStateChangeEvent.next(false)
      }, 200)
      return
    }
    this.isOpen = false
    this.openStateChangeEvent.next(false)

    if (this.parentDropdownContextService) {
      this.parentDropdownContextService.hide()
    }
  }
}
