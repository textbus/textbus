import { DropdownHandlerOption, HandlerType } from '../toolbar/help';

export const linkHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-link'],
  tooltip: '链接',
  match: {
    tags: ['A']
  }
};
