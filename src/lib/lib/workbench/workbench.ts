import { ComponentStage } from './component-stage';
import { Viewer } from '../viewer/viewer';

export class Workbench {
  elementRef = document.createElement('div');
  readonly componentStage = new ComponentStage(this);
  readonly tablet = document.createElement('div');

  private additionalWorktable = document.createElement('div');
  private dialogBg = document.createElement('div');
  private dialogWrapper = document.createElement('div');
  private dashboard = document.createElement('div');
  private editableArea = document.createElement('div');

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
    this.dashboard.appendChild(this.componentStage.elementRef);
    this.elementRef.appendChild(this.dashboard);
    const sub = this.viewer.onReady.subscribe(() => {
      this.tablet.appendChild(this.viewer.input.elementRef);
      this.viewer.setMinHeight(this.editableArea.offsetHeight);
      sub.unsubscribe();
    })
  }

  dialog(element: HTMLElement) {
    this.dialogWrapper.appendChild(element);
    this.dialogBg.classList.add('tbus-dialog-active');
    setTimeout(() => {
      this.dialogWrapper.classList.add('tbus-dialog-wrapper-active');
    }, 200)
  }

  closeDialog() {
    this.dialogWrapper.classList.remove('tbus-dialog-wrapper-active');
    setTimeout(() => {
      this.dialogBg.classList.remove('tbus-dialog-active');
      this.dialogWrapper.innerHTML = '';
    }, 200)
  }

  setTabletWidth(width: string) {
    if (width === '100%') {
      this.editableArea.style.padding = '';
      this.viewer.setMinHeight(this.editableArea.offsetHeight);
    } else {
      this.editableArea.style.padding = '20px';
      this.viewer.setMinHeight(this.editableArea.offsetHeight - 40);
    }
    this.tablet.style.width = width;
  }
}
