import { Subject } from 'rxjs';
import { TBSelection } from './selection';


export enum EventType {
  onEnter
}

export interface EventParams {
  type: EventType;
  selection: TBSelection
}

export class TBEvent {
  get stopped() {
    return this._stopped;
  }

  readonly type: EventType;
  readonly selection: TBSelection;

  private _stopped = false;

  constructor(config: EventParams) {
    this.type = config.type;
    this.selection = config.selection;
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
