import { DropdownHandlerOption, HandlerType } from '../toolbar/help';
import { Subject } from 'rxjs';
import { StyleFormatter } from '../toolbar/fomatter/style-formatter';

const selector = document.createElement('div');
const updateEvent = new Subject<string>();

selector.innerHTML = `
<ul>
  <li></li>
</ul>
`;

export const backgroundHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-background-color'],
  tooltip: '背景颜色',
  viewContents: selector,
  execCommand: new StyleFormatter('color', updateEvent.asObservable())
};
