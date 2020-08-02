import { Observable, Subject, Subscription } from 'rxjs';

import { HighlightState } from './help';
import {
  AdditionalHandler,
  AdditionalViewer,
  createKeymapHTML,
  Tool,
  ToolConfig,
  ToolFactory,
  ToolType
} from './toolkit/_api';
import { Editor } from '../editor';
import { Keymap } from '../viewer/input';
import { Renderer, TBSelection } from '../core/_api';
import { SelectionMatchDelta } from './matcher/matcher';
import { ContextMenu } from './context-menu';

export class Toolbar {
  elementRef = document.createElement('div');
  onAction: Observable<{ config: ToolConfig, instance: Tool, params: any }>;
  onComponentsStageChange: Observable<boolean>;

  set componentsSwitch(b: boolean) {
    this._componentsSwitch = b;
    this.componentsElement.style.display = b ? '' : 'none';
    if (!b) {
      this.componentStageExpand = false;
      this.componentsSwitchBtn.classList.remove('tbus-toolbar-components-btn-active');
      this.componentStageEvent.next(false);
    }
  }

  get componentsSwitch() {
    return this._componentsSwitch;
  }

  readonly tools: Array<{ config: ToolConfig, instance: Tool }> = [];

  private _componentsSwitch = true;
  private actionEvent = new Subject<{ config: ToolConfig, instance: Tool, params: any }>();
  private componentStageEvent = new Subject<boolean>();
  private toolWrapper = document.createElement('div');
  private toolsElement = document.createElement('div');
  private componentsElement = document.createElement('div');
  private componentsSwitchBtn = document.createElement('button');
  private additionalWorktable = document.createElement('div');
  private additionalWorktableContent = document.createElement('div');
  private additionalWorktableClose = document.createElement('div');
  private additionalWorktableCloseBtn = document.createElement('button');
  private keymapPrompt = document.createElement('div');
  private componentStageExpand = false;

  private currentAdditionalWorktableViewer: AdditionalViewer;

  private subs: Subscription[] = [];

  constructor(private context: Editor,
              private contextMenu: ContextMenu,
              private config: (ToolFactory | ToolFactory[])[],
              private options = {
                showComponentStage: true,
                openComponentState: false
              }) {
    this.onAction = this.actionEvent.asObservable();
    this.onComponentsStageChange = this.componentStageEvent.asObservable();
    this.elementRef.classList.add('tbus-toolbar');
    this.toolWrapper.classList.add('tbus-toolbar-wrapper');
    this.toolsElement.classList.add('tbus-toolbar-tools');
    this.componentsElement.classList.add('tbus-toolbar-components');
    this.additionalWorktable.classList.add('tbus-toolbar-additional-worktable');
    this.additionalWorktableContent.classList.add('tbus-toolbar-additional-worktable-content');
    this.additionalWorktableClose.classList.add('tbus-toolbar-additional-worktable-close');
    this.additionalWorktableCloseBtn.innerHTML = '&times;';
    this.additionalWorktableCloseBtn.type = 'button';
    this.keymapPrompt.classList.add('tbus-toolbar-keymap-prompt');
    this.componentStageExpand = options.openComponentState;
    if (options.showComponentStage) {
      const btn = this.componentsSwitchBtn;
      btn.type = 'button';
      btn.innerText = '组件库';
      btn.title = '展开或收起组件库';
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

    this.toolWrapper.append(this.toolsElement, this.componentsElement);
    this.additionalWorktableClose.append(this.additionalWorktableCloseBtn);
    this.additionalWorktable.append(this.additionalWorktableContent, this.additionalWorktableClose);
    this.elementRef.append(this.toolWrapper, this.additionalWorktable, this.keymapPrompt);

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
    this.additionalWorktableCloseBtn.addEventListener('click', () => {
      this.currentAdditionalWorktableViewer.destroy();
      this.additionalWorktableContent.innerHTML = '';
      this.additionalWorktable.classList.remove('tbus-toolbar-additional-worktable-show');
    })
  }

  updateHandlerState(selection: TBSelection, renderer: Renderer, sourceCodeModal: boolean) {
    this.tools.forEach(tool => {
      let s: SelectionMatchDelta;
      if (typeof tool.instance.updateStatus === 'function') {
        s = sourceCodeModal && !tool.config.supportSourceCodeModel ? {
          srcStates: [],
          matchData: null,
          state: HighlightState.Disabled
        } : tool.config.matcher?.queryState(selection, renderer, this.context);
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

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
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
      case ToolType.Additional:
        h = option.factory();
        this.subs.push((<AdditionalHandler>h).onShow.subscribe(viewer => {
          this.currentAdditionalWorktableViewer = viewer;
          this.additionalWorktableContent.innerHTML = '';
          this.additionalWorktable.classList.add('tbus-toolbar-additional-worktable-show');
          this.additionalWorktableContent.appendChild(viewer.elementRef);
        }));
        break;
      default:
        throw new Error('未被支持的工具！');
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
        item.instance.onApply.subscribe(params => {
          this.actionEvent.next({
            ...item,
            params
          });
        })
      }
    });
  }
}
