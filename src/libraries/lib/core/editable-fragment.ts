import { Contents } from './contents';
import { Template } from './template';
import { FormatRange } from './formatter';

export class EditableFragment {
  private contents = new Contents();
  private formatMap: any [] = [];

  get contentLength() {
    return this.contents.length;
  }

  append(element: string | Template) {
    this.contents.append(element);
  }

  mergeFormat(formatter: FormatRange) {
    this.formatMap.push(formatter);
  }
}
