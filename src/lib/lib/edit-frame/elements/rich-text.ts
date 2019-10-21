import { Observable } from 'rxjs';
import { TBElement } from './element';

export class RichText implements TBElement {
  get length() {
    return this.text.length;
  }

  text: string;

  onDestroy: Observable<this>;
  onContentChange: Observable<this>;

  destroy(): void {

  }

  render(): void {

  }
}
