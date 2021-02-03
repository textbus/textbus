import { CommandContext, Commander, FormatData, FormatEffect } from '../../core/_api';
import { BlockMarginFormatter } from '../../formatter/_api';

export class BlockMarginCommander implements Commander<Map<string, string>> {
  recordHistory = true;

  constructor(private formatter: BlockMarginFormatter) {
  }

  command(context: CommandContext, params: Map<string, string>) {
    context.selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(scope => {
        scope.fragment.apply(this.formatter, {
          effect: Array.from(params.values()).filter(i => i).length ? FormatEffect.Valid : FormatEffect.Invalid,
          startIndex: scope.startIndex,
          endIndex: scope.endIndex,
          formatData: new FormatData({
            styles: {
              marginTop: params.get('marginTop'),
              marginRight: params.get('marginRight'),
              marginBottom: params.get('marginBottom'),
              marginLeft: params.get('marginLeft'),
            }
          })
        })
      })
    })
  }
}
