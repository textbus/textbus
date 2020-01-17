import { Observable, Subject } from 'rxjs';

import { HandlerConfig, HandlerType } from './help';
import { Handler } from './handlers/help';
import { ButtonHandler } from './handlers/button-handler';
import { SelectHandler } from './handlers/select-handler';
import { DropdownHandler } from './handlers/dropdown-handler';
import { ActionSheetHandler } from './handlers/action-sheet-handler';
import { Editor } from '../editor';
import { DefaultTagsHandler } from '../default-tags-handler';
import { TBSelection } from '../viewer/selection';

export class Toolbar {
  elementRef = document.createElement('div');
  onAction: Observable<Handler>;
  readonly handlers: Handler[] = [];

  private actionEvent = new Subject<Handler>();

  constructor(private context: Editor, private config: (HandlerConfig | HandlerConfig[])[]) {
    this.onAction = this.actionEvent.asObservable();
    this.elementRef.classList.add('tanbo-editor-toolbar');

    const defaultHandlers = new DefaultTagsHandler();
    this.handlers.push(defaultHandlers);

    this.createToolbar(config);

    this.context.registerHook(defaultHandlers.hook);
  }

  updateHandlerState(selection: TBSelection) {
    this.handlers.filter(h => typeof h.updateStatus === 'function').forEach(handler => {
      const s = handler.matcher.queryState(selection, handler, this.context);
      handler.updateStatus(s);
    });
  }

  private createToolbar(handlers: (HandlerConfig | HandlerConfig[])[]) {
    if (Array.isArray(handlers)) {
      handlers.forEach(handler => {
        const group = document.createElement('span');
        group.classList.add('tanbo-editor-toolbar-group');
        if (Array.isArray(handler)) {
          this.createHandlers(handler).forEach(el => group.appendChild(el));
        } else {
          group.appendChild(this.createHandler(handler));
        }
        this.elementRef.appendChild(group);
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
    if (option.hook) {
      this.context.registerHook(option.hook)
    }
    let h: Handler;
    switch (option.type) {
      case HandlerType.Button:
        h = new ButtonHandler(option);
        break;
      case HandlerType.Select:
        h = new SelectHandler(option);
        break;
      case HandlerType.Dropdown:
        h = new DropdownHandler(option, this.context);
        break;
      case HandlerType.ActionSheet:
        h = new ActionSheetHandler(option);
        break;
    }
    if (h.keymap) {
      const keymaps = Array.isArray(h.keymap) ? h.keymap : [h.keymap];
      keymaps.forEach(k => {
        this.context.registerKeymap(k);
      });
    }
    this.handlers.push(h);
    return h.elementRef;
  }

  private listenUserAction() {
    this.handlers.forEach(item => {
      if (item.onApply instanceof Observable) {
        item.onApply.subscribe(() => {
          this.actionEvent.next(item);
        })
      }
    });
  }
}
