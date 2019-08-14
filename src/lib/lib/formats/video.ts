import { DropdownHandler, HandlerType } from '../toolbar/help';

export const videoHandler: DropdownHandler = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-video'],
  tooltip: '视频',
  match: {
    tags: ['VIDEO']
  }
};
