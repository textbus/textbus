import { ButtonConfig, HandlerType } from '../help';
import { BoldCommander } from '../../commands/bold-commander';
import { boldFormatter } from '../../formatter/bold';
import { Formatter } from '../../core/formatter';
import { FormatMatcher } from '../../matcher/format-matcher';

export const bold: ButtonConfig<Formatter> = {
  type: HandlerType.Button,
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  match: new FormatMatcher<Formatter>(boldFormatter),
  execCommand: new BoldCommander()
};
