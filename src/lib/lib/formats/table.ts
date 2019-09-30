import { DropdownHandlerOption, DropdownHandlerView, HandlerType } from '../toolbar/help';
import { Subject } from 'rxjs';
import { StyleFormatter } from '../frame/fomatter/style-formatter';

class TableViewer implements DropdownHandlerView {
  host = document.createElement('div');

  updateStateByElement(attrs: { [p: string]: any }): void {
  }
}

const updateEvent = new Subject<string>();
const hideEvent = new Subject<void>();

export const tableHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-table'],
  tooltip: '表格',
  onHide: hideEvent.asObservable(),
  viewer: new TableViewer(),
  match: {
    tags: ['table']
  },
  execCommand: new StyleFormatter('color', updateEvent.asObservable())
};
