import { Subject } from 'rxjs';
import { createPicker } from '@tanbo/color-picker';

import { DropdownHandlerOption, HandlerType } from '../toolbar/help';
import { StyleFormatter } from '../toolbar/fomatter/style-formatter';

const selector = document.createElement('div');
const updateEvent = new Subject<string>();
const hideEvent = new Subject<void>();

const picker = createPicker(selector);

picker.onSelected = function (ev) {
  updateEvent.next(ev.hex);
  hideEvent.next();
};

export const backgroundHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-background-color'],
  tooltip: '背景颜色',
  onHide: hideEvent.asObservable(),
  viewContents: selector,
  execCommand: new StyleFormatter('backgroundColor', updateEvent.asObservable())
};
