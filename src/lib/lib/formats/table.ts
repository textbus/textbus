import { DropdownHandler, HandlerType } from '../toolbar/help';

export const tableHandler: DropdownHandler = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-table'],
  tooltip: '视频',
  match: {
    tags: ['TABLE']
  }
};
