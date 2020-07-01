import { Commander, Lifecycle, TBSelection } from '../core/_api';
import { Editor } from '../../public-api';
import { DeviceCommander } from '../toolbar/commands/device.commander';

export class DeviceHook implements Lifecycle {
  onApplyCommand(commander: Commander, selection: TBSelection, editor: Editor): boolean {
    if (commander instanceof DeviceCommander) {
      commander.commandBefore(editor);
    }
    return true;
  }
}
