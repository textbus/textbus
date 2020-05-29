import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';

export class EmojiCommander implements Commander<string> {
  recordHistory = true;
  private value: string = '';

  updateValue(value: string): void {
    this.value = value;
  }

  command(selection: TBSelection): void {
    // selection.ranges.forEach(range => {
    //   range.startFragment.insert(this.value, range.startIndex);
    //   range.startIndex = range.endIndex = range.startIndex + this.value.length;
    // });
  }
}
