import { ContextMenuConfig, Tool } from './toolkit/help';
import { Renderer, TBSelection } from '../core/_api';

export class ContextMenu {
  constructor(private renderer: Renderer) {
  }

  setMenus(configList: ContextMenuConfig[], selection: TBSelection, tool: Tool) {
    // configList[0]?.action(this.renderer, selection, tool);
    // console.log(configList);
  }
}
