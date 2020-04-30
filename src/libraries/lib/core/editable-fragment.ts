import { Contents } from './contents';
import { Template } from './template';
import { FormatRange } from './formatter';

export class EditableFragment {
  private contents = new Contents();
  private f: any [] = [];

  append(element: string | Template) {
    this.contents.append(element);
  }

  mergeFormat(formatter: FormatRange) {
    this.f.push(formatter);
  }
}
