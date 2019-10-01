import { HandlerOption } from './toolbar/help';
import { Observable } from 'rxjs';

export interface EditorOptions {
  historyStackSize?: number;
  handlers?: (HandlerOption | HandlerOption[])[];
  uploader?(type: string): (string | Promise<string> | Observable<string>);
}

export interface EventDelegate {
  dispatchEvent(type: string): Observable<string>
}
