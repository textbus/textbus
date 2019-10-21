import { Observable } from 'rxjs';

export interface TBElement {
  length: number;
  onDestroy: Observable<this>;
  onContentChange: Observable<this>;
  destroy(): void;
  render(): void;
}
