import { Subject } from 'rxjs';
import { TBSelection } from './selection';
import { Renderer } from './renderer';


export enum EventType {
  onEnter,
  onDelete
}

export interface EventParams {
  type: EventType;
  selection: TBSelection;
  renderer: Renderer;
}

export class TBEvent {
  get stopped() {
    return this._stopped;
  }

  readonly type: EventType;
  readonly selection: TBSelection;
  readonly renderer: Renderer;

  private _stopped = false;

  constructor(config: EventParams) {
    this.type = config.type;
    this.selection = config.selection;
    this.renderer = config.renderer;
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
