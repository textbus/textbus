import { Hook } from '../../viewer/help';
import { Viewer } from '../../viewer/viewer';
import { Parser } from '../../parser/parser';
import { AbstractData } from '../utils/abstract-data';

export class CodeHook implements Hook {
  onEnter(event: Event, viewer: Viewer, parser: Parser, next: () => void): void {
  }

  onInput(event: Event, viewer: Viewer, parser: Parser, next: () => void): void {
    const commonAncestorFragment = viewer.selection.commonAncestorFragment;
    const elementRef = commonAncestorFragment.token.elementRef;
    if (/pre/i.test(elementRef.name)) {
      elementRef.nativeElement.innerText.replace(/(var)/gm, (str: string, $1: string, $2: number) => {
        const formatStates = parser.getFormatStateByData(new AbstractData({
          tag: 'strong',
          style: {
            name: 'color',
            value: '#f00'
          }
        }));
        commonAncestorFragment.mergeMatchStates(formatStates, $2, $1.length + $2, false);
        return str;
      });
    }
    next();
  }
}
