import { ContextMenuConfig } from './help';
import { Tool } from './handlers/help';
import { Renderer } from '../core/renderer';
import { TBSelection } from '../core/selection';

export class ContextMenu {
  constructor(private renderer: Renderer) {
  }

  setMenus(configList: ContextMenuConfig[], selection: TBSelection, tool: Tool) {
    // configList[0]?.action(this.renderer, selection, tool);
    // console.log(configList);
  }
}
