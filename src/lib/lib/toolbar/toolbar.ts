import { Observable, Subject } from 'rxjs';

import { HighlightState, ToolConfig, ToolType } from './help';
import {
  createKeymapHTML,
  Tool,
  ButtonHandler,
  SelectHandler,
  DropdownHandler,
  ActionSheetHandler
} from './handlers/_api';
import { Editor } from '../editor';
import { Keymap } from '../viewer/input';
import { TBSelection, Renderer } from '../core/_api';
import { SelectionMatchDelta } from './matcher/matcher';
import { ContextMenu } from './context-menu';

export class Toolbar {
  elementRef = document.createElement('div');
  onAction: Observable<ToolConfig>;
  readonly tools: Array<{ config: ToolConfig, instance: Tool }> = [];

  private actionEvent = new Subject<ToolConfig>();
  private toolsElement = document.createElement('div');
  private keymapPrompt = document.createElement('div');

  constructor(private context: Editor, private contextMenu: ContextMenu, private config: (ToolConfig | ToolConfig[])[]) {
    this.onAction = this.actionEvent.asObservable();
    this.elementRef.classList.add('tbus-toolbar');
    this.toolsElement.classList.add('tbus-toolbar-tools');
    this.keymapPrompt.classList.add('tbus-toolbar-keymap-prompt');

    this.elementRef.appendChild(this.toolsElement);
    this.elementRef.appendChild(this.keymapPrompt);

    this.createToolbar(config);

    this.elementRef.addEventListener('mouseover', (ev) => {
      const keymap = this.findNeedShowKeymapHandler(ev.target as HTMLElement);
      if (keymap) {
        try {
          const config: Keymap = JSON.parse(keymap);
          this.keymapPrompt.innerHTML = createKeymapHTML(config);
          this.keymapPrompt.classList.add('tbus-toolbar-keymap-prompt-show');
          return;
        } catch (e) {

        }
      }
      this.keymapPrompt.classList.remove('tbus-toolbar-keymap-prompt-show');
    })
  }

  updateHandlerState(selection: TBSelection, renderer: Renderer) {
    this.tools.forEach(tool => {
      let s: SelectionMatchDelta;
      if (typeof tool.instance.updateStatus === 'function') {
        s = tool.config.match?.queryState(selection, renderer, this.context);
        if (s) {
          tool.instance.updateStatus(s);
        }
      }
      if (Array.isArray(tool.config.contextMenu)) {
        const menus = tool.config.contextMenu.filter(m => {
          if (typeof m.displayNeedMatch === 'boolean') {
            return m.displayNeedMatch === (s.state === HighlightState.Highlight);
          }
          return true;
        });
        this.contextMenu.setMenus(menus, selection, tool.instance);
      }
    })
  }

  private findNeedShowKeymapHandler(el: HTMLElement): string {
    if (el === this.elementRef) {
      return;
    }
    if (el.dataset.keymap) {
      return el.dataset.keymap;
    }
    return this.findNeedShowKeymapHandler(el.parentNode as HTMLElement);
  }

  private createToolbar(handlers: (ToolConfig | ToolConfig[])[]) {
    if (Array.isArray(handlers)) {
      handlers.forEach(handler => {
        const group = document.createElement('span');
        group.classList.add('tbus-toolbar-group');
        if (Array.isArray(handler)) {
          this.createHandlers(handler).forEach(el => group.appendChild(el));
        } else {
          group.appendChild(this.createHandler(handler));
        }
        this.toolsElement.appendChild(group);
      });
      this.listenUserAction();
    }
  }

  private createHandlers(handlers: ToolConfig[]) {
    return handlers.map(handler => {
      return this.createHandler(handler);
    });
  }

  private createHandler(option: ToolConfig) {
    let h: Tool;
    switch (option.type) {
      case ToolType.Button:
        h = new ButtonHandler(option);
        break;
      case ToolType.Select:
        h = new SelectHandler(option, this.toolsElement);
        break;
      case ToolType.Dropdown:
        h = new DropdownHandler(option, this.context, this.toolsElement);
        break;
      case ToolType.ActionSheet:
        h = new ActionSheetHandler(option, this.toolsElement);
        break;
    }
    if (h.keymapAction) {
      const keymaps = Array.isArray(h.keymapAction) ? h.keymapAction : [h.keymapAction];
      keymaps.forEach(k => {
        this.context.registerKeymap(k);
      });
    }
    this.tools.push({
      config: option,
      instance: h
    });
    return h.elementRef;
  }

  private listenUserAction() {
    this.tools.forEach(item => {
      if (item.instance.onApply instanceof Observable) {
        item.instance.onApply.subscribe(() => {
          this.actionEvent.next(item.config);
        })
      }
    });
  }
}
