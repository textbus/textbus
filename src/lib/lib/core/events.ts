import { Subject } from 'rxjs';
import { TBSelection } from './selection';
import { Renderer } from './renderer';

export enum EventType {
  onEnter,
  onDelete,
  onInput,
  onPaste,
  onRendered
}

export interface EventParams {
  type: EventType;
  selection: TBSelection;
  renderer: Renderer;
  data?: {[key: string]: any};
}

export class TBEvent {
  get stopped() {
    return this._stopped;
  }

  readonly type: EventType;
  readonly selection: TBSelection;
  readonly renderer: Renderer;
  readonly data: {[key: string]: any};

  private _stopped = false;

  constructor(config: EventParams) {
    this.type = config.type;
    this.selection = config.selection;
    this.renderer = config.renderer;
    this.data = config.data;
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
