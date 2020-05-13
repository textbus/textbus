import { ButtonConfig, HandlerType } from '../help';
import { BoldCommander } from '../../commands/bold-commander';
import { Matcher } from '../../matcher/matcher';
import { boldFormatter } from '../../formatter/bold';

export const bold: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  matcher: new Matcher() as any,
  execCommand: new BoldCommander()
}
