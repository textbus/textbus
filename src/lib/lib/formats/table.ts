import { DropdownHandlerOption, HandlerType } from '../toolbar/help';

export const tableHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-table'],
  tooltip: '视频',
  match: {
    tags: ['TABLE']
  }
};
