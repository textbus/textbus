import { Observable } from 'rxjs';

import { Tool } from './help';
import { HighlightState } from '../help';
import { SelectionMatchState } from '../matcher/_api';
import { Commander } from '../../core/_api';
import { UIButton, UIKit } from '../../uikit/uikit';
import { DropdownToolConfig, DropdownViewer } from './dropdown.handler';
import { DialogManager } from '../../workbench/workbench';
import { FileUploader } from '../../uikit/forms/help';

export interface FormViewer extends DropdownViewer {
  setFileUploader(fileUploader: FileUploader): void;
}

export interface FormToolConfig extends DropdownToolConfig {
  menuFactory(): FormViewer;
}

export class FormHandler implements Tool {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  commander: Commander;
  private button: UIButton;
  private viewer: FormViewer;

  constructor(private config: FormToolConfig,
              private delegate: FileUploader,
              private dialogManager: DialogManager) {
    this.commander = config.commanderFactory();
    const viewer = config.menuFactory();
    this.viewer = viewer;

    this.onApply = viewer.onComplete;

    this.button = UIKit.button({
      ...config,
      onChecked() {
        dialogManager.dialog(viewer.elementRef);
        const s = viewer.onComplete.subscribe(() => {
          dialogManager.close();
          s.unsubscribe();
        })
        const b = viewer.onClose?.subscribe(() => {
          dialogManager.close();
          s.unsubscribe();
          b.unsubscribe();
        })
      }
    });

    this.elementRef = this.button.elementRef;

    if (typeof viewer.setFileUploader === 'function') {
      viewer.setFileUploader(delegate);
    }
  }

  updateStatus(selectionMatchState: SelectionMatchState): void {
    this.viewer.update(selectionMatchState.matchData);
    switch (selectionMatchState.state) {
      case HighlightState.Highlight:
        this.button.disabled = false;
        this.button.highlight = true;
        break;
      case HighlightState.Normal:
        this.button.disabled = false;
        this.button.highlight = false;
        break;
      case HighlightState.Disabled:
        this.button.disabled = true;
        this.button.highlight = false;
        break
    }
  }
}
