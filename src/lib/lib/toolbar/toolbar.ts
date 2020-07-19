import { Observable, Subject } from 'rxjs';

import { HighlightState } from './help';
import { createKeymapHTML, Tool, ToolConfig, ToolFactory, ToolType } from './toolkit/_api';
import { Editor } from '../editor';
import { Keymap } from '../viewer/input';
import { Renderer, TBSelection } from '../core/_api';
import { SelectionMatchDelta } from './matcher/matcher';
import { ContextMenu } from './context-menu';

export class Toolbar {
  elementRef = document.createElement('div');
  onAction: Observable<{ config: ToolConfig, instance: Tool }>;
  onComponentsStageChange: Observable<boolean>;
  readonly tools: Array<{ config: ToolConfig, instance: Tool }> = [];

  private actionEvent = new Subject<{ config: ToolConfig, instance: Tool }>();
  private componentStageEvent = new Subject<boolean>();
  private toolsElement = document.createElement('div');
  private componentsElement = document.createElement('div');
  private keymapPrompt = document.createElement('div');
  private componentStageExpand = false;

  constructor(private context: Editor, private contextMenu: ContextMenu, private config: (ToolFactory | ToolFactory[])[], private options = {
    showComponentStage: true,
    openComponentState: false
  }) {
    this.onAction = this.actionEvent.asObservable();
    this.onComponentsStageChange = this.componentStageEvent.asObservable();
    this.elementRef.classList.add('tbus-toolbar');
    this.toolsElement.classList.add('tbus-toolbar-tools');
    this.componentsElement.classList.add('tbus-toolbar-components');
    this.keymapPrompt.classList.add('tbus-toolbar-keymap-prompt');
    this.componentStageExpand = options.openComponentState;
    if (options.showComponentStage) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerText = '组件库';
      btn.classList.add('tbus-toolbar-components-btn');
      btn.addEventListener('click', () => {
        this.componentStageExpand = !this.componentStageExpand;
        this.componentStageExpand ?
          btn.classList.add('tbus-toolbar-components-btn-active') :
          btn.classList.remove('tbus-toolbar-components-btn-active');
        this.componentStageEvent.next(this.componentStageExpand);
      })

      if (options.openComponentState) {
        btn.classList.add('tbus-toolbar-components-btn-active');
      }
      this.componentsElement.appendChild(btn);
    }


    this.elementRef.appendChild(this.toolsElement);
    this.elementRef.appendChild(this.componentsElement);
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
        s = tool.config.matcher?.queryState(selection, renderer, this.context);
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

  private createToolbar(handlers: (ToolFactory | ToolFactory[])[]) {
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

  private createHandlers(handlers: ToolFactory[]) {
    return handlers.map(handler => {
      return this.createHandler(handler);
    });
  }

  private createHandler(option: ToolFactory) {
    let h: Tool;
    switch (option.type) {
      case ToolType.Button:
        h = option.factory();
        break;
      case ToolType.Select:
        h = option.factory(this.toolsElement);
        break;
      case ToolType.Dropdown:
        h = option.factory(this.context, this.toolsElement);
        break;
      case ToolType.ActionSheet:
        h = option.factory(this.toolsElement);
        break;
    }
    if (h.keymapAction) {
      const keymaps = Array.isArray(h.keymapAction) ? h.keymapAction : [h.keymapAction];
      keymaps.forEach(k => {
        this.context.registerKeymap(k);
      });
    }
    this.tools.push({
      config: option.config,
      instance: h
    });
    return h.elementRef;
  }

  private listenUserAction() {
    this.tools.forEach(item => {
      if (item.instance.onApply instanceof Observable) {
        item.instance.onApply.subscribe(() => {
          this.actionEvent.next(item);
        })
      }
    });
  }
}
