import { DropdownHandlerOption, HandlerType } from '../toolbar/help';

export const videoHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-video'],
  tooltip: '视频',
  match: {
    tags: ['VIDEO']
  }
};
