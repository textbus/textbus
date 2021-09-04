import { merge, Subject } from 'rxjs';
import { FileUploader, I18n } from '@textbus/core';

import { UIKit } from '../_utils/uikit';
import { Tool, ToolFactoryParams, HighlightState, ToolFactory } from '../help';
import { SelectionMatchState } from '../matcher/_api';
import { DropdownToolConfig, DropdownViewer } from './dropdown-tool';

export interface FormViewer extends DropdownViewer {
  setFileUploader(fileUploader: FileUploader): void;
}

export interface FormToolConfig extends DropdownToolConfig {
  viewFactory(i18n: I18n): FormViewer;
}

export class FormTool<T> implements ToolFactory<T> {
  constructor(private config: FormToolConfig) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool<T>) => void): HTMLElement {
    const {i18n, dialog, uploader} = params;
    const config = {
      ...this.config,
      label: typeof this.config.label === 'function' ? this.config.label(i18n) : this.config.label,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip
    };
    const viewer = config.viewFactory(i18n);
    let prevValue: T = null;
    const subject = new Subject<T>();
    const obs = subject.asObservable();
    const button = UIKit.button({
      ...config,
      onChecked: () => {
        dialog.dialog(viewer.elementRef);
        const s = viewer.onComplete.subscribe(value => {
          prevValue = value;
          dialog.close();
          s.unsubscribe();
        })
        const b = viewer.onClose?.subscribe(() => {
          dialog.close();
          s.unsubscribe();
          b.unsubscribe();
        });
      }
    });
    if (typeof viewer.setFileUploader === 'function') {
      viewer.setFileUploader(uploader);
    }
    addTool({
      keymaps: config.keymap ? [{
        keymap: config.keymap,
        action() {
          if (!button.disabled) {
            subject.next(prevValue);
          }
        }
      }] : [],
      onAction: merge(viewer.onComplete, obs),
      commander: config.commanderFactory(),
      matcher: config.matcher,
      refreshState(selectionMatchState: SelectionMatchState): void {
        viewer.update(selectionMatchState.matchData);
        switch (selectionMatchState.state) {
          case HighlightState.Highlight:
            button.disabled = false;
            button.highlight = true;
            break;
          case HighlightState.Normal:
            button.disabled = false;
            button.highlight = false;
            break;
          case HighlightState.Disabled:
            button.disabled = true;
            button.highlight = false;
            break
        }
      }
    })
    return button.elementRef;
  }
}
