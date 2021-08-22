import { CommandContext, Commander } from '../commander';

export class EmojiCommander implements Commander<string> {
  recordHistory = true;

  command(context: CommandContext, f: string): void {
    context.selection.ranges.forEach(range => {
      range.startFragment.insert(f, range.startIndex);
      range.startIndex = range.endIndex = range.startIndex + f.length;
    });
  }
}
