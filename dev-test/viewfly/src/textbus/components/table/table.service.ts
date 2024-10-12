import { Injectable } from '@viewfly/core'
import { Subject } from '@textbus/core'

@Injectable()
export class TableService {
  onInsertRowBefore = new Subject<number | null>()
  onInsertColumnBefore = new Subject<number | null>()
  onSelectColumns = new Subject<{ start: number, end: number } | null>()
  onSelectRows = new Subject<{ start: number, end: number } | null>()

  onScroll = new Subject<number>()
}
