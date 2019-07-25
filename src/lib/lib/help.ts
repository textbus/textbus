import { Handler } from './toolbar/toolbar';

export interface EditorOptions {
  handlers?: (Handler | Handler[])[];
}
