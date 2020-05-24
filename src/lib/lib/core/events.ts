import { Subject } from 'rxjs';

export class Event {
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

export enum EventType {
  onEnter
}

export class EventEmitter extends Subject<Event> {
  emit(value: Event) {
    super.next(value);
  }
}
