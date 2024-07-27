import { Injectable } from '@viewfly/core'
import { Subject } from '@textbus/core'


@Injectable()
export class RefreshService {
  onRefresh = new Subject<void>()
}
