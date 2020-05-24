import { Subject } from 'rxjs';
import { Fragment } from '@tanbo/tbus/core/fragment';


export enum EventType {
  onEnter
}

export interface EventParams {
  type: EventType;
  srcEvent: Event;
  startFragment: Fragment;
  endFragment: Fragment;
  startIndex: number;
  endIndex: number;

}

export class TBEvent {
  get stopped() {
    return this._stopped;
  }

  private _stopped = false;

  constructor(public readonly type: EventType) {
  }

  stopPropagation() {
    this._stopped = true;
  }
}

export class EventEmitter extends Subject<TBEvent> {
  emit(value: TBEvent) {
    super.next(value);
  }
}
