import { fromEvent, Subscription } from 'rxjs';
import { auditTime, distinctUntilChanged, map } from 'rxjs/operators';
import {
  Inject,
  Injectable,
  InjectionToken,
  Injector,
  Optional,
  TBPlugin,
  Layout,
  I18n,
  UIDialog,
  FileUploader,
  Keymap,
  TBSelection,
  TBHistory,
  Input,
  EditorController,
  createElement
} from '@textbus/core';

import { createKeymapHTML } from './_utils/uikit';
import { HighlightState, Tool, ToolFactory } from './help';
import { SelectionMatchState } from './matcher/_api';

export const TOOLS = new InjectionToken<Array<ToolFactory | ToolFactory[]>>('TOOLS');

@Injectable()
export class Toolbar implements TBPlugin {
  private elementRef: HTMLElement;
  private toolWrapper: HTMLElement;
  private keymapPrompt: HTMLElement;
  private toolInstances: Tool<any>[] = [];
  private factories: ToolFactory[] = [];

  private subs: Subscription[] = [];

  constructor(@Optional() @Inject(TOOLS) private tools: Array<ToolFactory | ToolFactory[]>,
              private layout: Layout,
              private editorController: EditorController,
              private i18n: I18n,
              private input: Input,
              private injector: Injector,
              private history: TBHistory,
              private dialog: UIDialog,
              private selection: TBSelection,
              private fileUploader: FileUploader) {
    this.tools = this.tools || [];
  }

  setup() {
    this.elementRef = createElement('div', {
      classes: ['textbus-toolbar'],
      children: [
        this.toolWrapper = createElement('div', {
          classes: ['textbus-toolbar-wrapper']
        }),
        this.keymapPrompt = createElement('div', {
          classes: ['textbus-toolbar-keymap-prompt']
        })
      ]
    })
    this.tools.forEach(factory => {
      const group = document.createElement('span');
      group.classList.add('textbus-toolbar-group');
      this.toolWrapper.appendChild(group);
      if (Array.isArray(factory)) {
        factory.forEach(t => {
          this.factories.push(t);
          group.appendChild(this.initTool(t))
        })
        return;
      }
      group.appendChild(this.initTool(factory));
    })

    this.subs.push(
      this.editorController.onStateChange.pipe(map(status => {
        return status.sourcecodeMode || status.readonly;
      }), distinctUntilChanged()).subscribe(b => {
        this.toolInstances.forEach(t => {
          t.refreshState({
            matchData: null,
            srcStates: [],
            state: b ? HighlightState.Disabled : HighlightState.Normal
          })
        })
      }),
      this.selection.onChange.pipe(auditTime(100)).subscribe(() => {
        const event = document.createEvent('Event');
        event.initEvent('click', true, true);
        this.elementRef.dispatchEvent(event);
        this.updateHandlerState();
      }),
      this.history.onChange.subscribe(() => {
        this.updateHandlerState();
      }),
      fromEvent(this.elementRef, 'mouseover').subscribe(ev => {
        const keymap = this.findNeedShowKeymapHandler(ev.target as HTMLElement);
        if (keymap) {
          try {
            const config: Keymap = JSON.parse(keymap);
            this.keymapPrompt.innerHTML = '';
            this.keymapPrompt.append(...createKeymapHTML(config));
            this.keymapPrompt.classList.add('textbus-toolbar-keymap-prompt-show');
            return;
          } catch (e) {
            //
          }
        }
        this.keymapPrompt.classList.remove('textbus-toolbar-keymap-prompt-show');
      }),
    )

    this.layout.topBar.appendChild(this.elementRef);
  }

  onDestroy() {
    this.factories.forEach(factory => {
      factory.onDestroy?.();
    })
    this.toolInstances.forEach(map => {
      map.matcher?.onDestroy?.();
      map.commander?.onDestroy?.();
    })
    this.subs.forEach(i => i.unsubscribe());
  }

  private initTool(factory: ToolFactory) {
    const selection = this.selection;
    return factory.create({
      i18n: this.i18n,
      dialog: this.dialog,
      limitElement: this.elementRef,
      uploader: this.fileUploader
    }, tool => {
      this.toolInstances.push(tool);
      tool.matcher?.setup?.(this.injector);
      tool.commander?.setup?.(this.injector);
      (tool.keymaps || []).forEach(k => {
        this.input.addKeymap(k);
      })

      if (tool.commander) {
        this.subs.push(tool.onAction.subscribe(value => {
          const state = tool.matcher ?
            tool.matcher.queryState(selection).state :
            HighlightState.Normal;
          if (state === HighlightState.Disabled) {
            return;
          }
          const overlap = state === HighlightState.Highlight;

          tool.commander.command({
            selection,
            overlap,
          }, value);

          this.updateHandlerState();

          if (tool.commander.recordHistory) {
            this.history.record();
          }
        }))
      }
    });
  }

  private updateHandlerState() {
    if (!this.selection.commonAncestorFragment) {
      return;
    }
    this.toolInstances.forEach(tool => {
      let s: SelectionMatchState;
      if (typeof tool.refreshState === 'function') {
        s = tool.matcher?.queryState(this.selection) || {
          srcStates: [],
          matchData: null,
          state: HighlightState.Normal
        };
        tool.refreshState(s);
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
}
