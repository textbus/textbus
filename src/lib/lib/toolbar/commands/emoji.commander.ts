import { Commander, TBSelection } from '../../core/_api';

export class EmojiCommander implements Commander<string> {
  recordHistory = true;

  command(selection: TBSelection, f: string): void {
    selection.ranges.forEach(range => {
      range.startFragment.insert(f, range.startIndex);
      range.startIndex = range.endIndex = range.startIndex + f.length;
    });
  }
}
