import { ButtonConfig, HandlerType } from '../help';
import { BoldCommander } from '../../commands/bold-commander';
import { boldFormatter } from '../../formatter/bold';

export const bold: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-bold'],
  tooltip: '加粗',
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  matcher: boldFormatter,
  execCommand: new BoldCommander()
}
