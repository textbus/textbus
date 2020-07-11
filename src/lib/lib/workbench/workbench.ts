import { TemplateStage } from './template-stage';
import { Viewer } from '../viewer/viewer';

export class Workbench {
  elementRef = document.createElement('div');
  readonly templateStage = new TemplateStage(this);

  private additionalWorktable = document.createElement('div');
  private dialogBg = document.createElement('div');
  private dialogWrapper = document.createElement('div');
  private dashboard = document.createElement('div');
  private editableArea = document.createElement('div');
  private tablet = document.createElement('div');

  constructor(private viewer: Viewer) {
    this.elementRef.classList.add('tbus-workbench');

    this.additionalWorktable.classList.add('tbus-additional-worktable');
    this.dialogBg.classList.add('tbus-dialog');
    this.dialogWrapper.classList.add('tbus-dialog-wrapper');
    this.dashboard.classList.add('tbus-dashboard');
    this.editableArea.classList.add('tbus-editable-area');
    this.tablet.classList.add('tbus-tablet');

    this.dialogBg.appendChild(this.dialogWrapper);
    this.additionalWorktable.appendChild(this.dialogBg);
    this.elementRef.appendChild(this.additionalWorktable);

    this.tablet.appendChild(this.viewer.elementRef);
    this.editableArea.appendChild(this.tablet);
    this.dashboard.appendChild(this.editableArea);
    this.dashboard.appendChild(this.templateStage.elementRef);
    this.elementRef.appendChild(this.dashboard);
    const sub = this.viewer.onReady.subscribe(() => {
      this.tablet.appendChild(this.viewer.input.elementRef);
      sub.unsubscribe();
    })
  }

  dialog(element: HTMLElement) {
    this.dialogWrapper.appendChild(element);
    this.dialogBg.classList.add('tbus-dialog-active');
  }

  closeDialog() {
    this.dialogWrapper.innerHTML = '';
    this.dialogBg.classList.remove('tbus-dialog-active');
  }

  setTabletWidth(width: string) {
    this.editableArea.style.padding = width === '100%' ? '' : '20px';
    this.tablet.style.width = width;
  }
}
