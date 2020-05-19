import { Observable, Subject } from 'rxjs';

import { HandlerConfig, HandlerType } from './help';
import { createKeymapHTML, Handler } from './handlers/help';
import { ButtonHandler } from './handlers/button-handler';
import { SelectHandler } from './handlers/select-handler';
import { DropdownHandler } from './handlers/dropdown-handler';
import { ActionSheetHandler } from './handlers/action-sheet-handler';
import { Editor } from '../editor';
import { KeymapConfig } from '../viewer/events';
import { TBSelection } from '../viewer/selection';
import { Formatter } from '../core/formatter';
import { Renderer } from '../core/renderer';

export class Toolbar {
  elementRef = document.createElement('div');
  onAction: Observable<HandlerConfig>;
  readonly handlers: Array<{ config: HandlerConfig, instance: Handler }> = [];
  readonly styleSheets: string[] = [];

  private actionEvent = new Subject<HandlerConfig>();
  private toolsElement = document.createElement('div');
  private keymapPrompt = document.createElement('div');

  constructor(private context: Editor, private config: (HandlerConfig | HandlerConfig[])[]) {
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
          const config: KeymapConfig = JSON.parse(keymap);
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
    this.handlers.filter(h => typeof h.instance.updateStatus === 'function').forEach(handler => {
      console.log(333)
      const s = handler.config.match.queryState(selection, renderer, this.context);
      handler.instance.updateStatus(s || {});
    });
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

  private createToolbar(handlers: (HandlerConfig | HandlerConfig[])[]) {
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

  private createHandlers(handlers: HandlerConfig[]) {
    return handlers.map(handler => {
      return this.createHandler(handler);
    });
  }

  private createHandler(option: HandlerConfig) {
    let h: Handler;
    switch (option.type) {
      case HandlerType.Button:
        h = new ButtonHandler(option);
        break;
      case HandlerType.Select:
        h = new SelectHandler(option, this.toolsElement);
        break;
      case HandlerType.Dropdown:
        h = new DropdownHandler(option, this.context, this.toolsElement);
        break;
      case HandlerType.ActionSheet:
        h = new ActionSheetHandler(option, this.toolsElement);
        break;
    }
    if (h.keymap) {
      const keymaps = Array.isArray(h.keymap) ? h.keymap : [h.keymap];
      keymaps.forEach(k => {
        // this.context.registerKeymap(k);
      });
    }
    this.handlers.push({
      config: option,
      instance: h
    });
    return h.elementRef;
  }

  private listenUserAction() {
    this.handlers.forEach(item => {
      if (item.instance.onApply instanceof Observable) {
        item.instance.onApply.subscribe(() => {
          this.actionEvent.next(item.config);
        })
      }
    });
  }
}
