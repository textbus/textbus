import { Commander } from '../../core/_api';
import { Editor } from '../../editor';

export class DeviceCommander implements Commander<string> {
  recordHistory = false;

  private value: string;
  private editor: Editor;

  updateValue(value: string) {
    this.value = value;
  }

  commandBefore(editor: Editor) {
    this.editor = editor;
  }

  command() {
    this.editor.device = this.value;
  }
}
