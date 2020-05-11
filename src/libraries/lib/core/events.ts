import { Subject } from 'rxjs';

export class Event {
  constructor(public readonly type: EventType) {
  }
}

export enum EventType {
  onEnter
}

export class EventEmitter extends Subject<Event> {
  trigger(type: EventType) {
    setTimeout(() => {
      this.emit(new Event(type));
    })
  }

  emit(value: Event) {
    super.next(value);
  }
}
