import { ComponentStage } from './component-stage';
import { Viewer } from '../viewer/viewer';
import { EventDelegate } from '../uikit/forms/help';

export interface DialogManager {
  dialog(content: HTMLElement): void;

  close(): void;
}

export class Workbench implements DialogManager {
  elementRef = document.createElement('div');
  readonly componentStage = new ComponentStage(this, this.delegate);
  readonly tablet = document.createElement('div');

  private additionalWorktable = document.createElement('div');
  private dialogBg = document.createElement('div');
  private dialogWrapper = document.createElement('div');
  private dashboard = document.createElement('div');
  private editableArea = document.createElement('div');
  private loading = document.createElement('div');

  constructor(private viewer: Viewer, private delegate: EventDelegate) {
    this.elementRef.classList.add('textbus-workbench');

    this.additionalWorktable.classList.add('textbus-additional-worktable');
    this.dialogBg.classList.add('textbus-dialog');
    this.dialogWrapper.classList.add('textbus-dialog-wrapper');
    this.dashboard.classList.add('textbus-dashboard');
    this.editableArea.classList.add('textbus-editable-area');
    this.tablet.classList.add('textbus-tablet');

    this.dialogBg.appendChild(this.dialogWrapper);
    this.additionalWorktable.appendChild(this.dialogBg);
    this.elementRef.appendChild(this.additionalWorktable);

    this.tablet.appendChild(this.viewer.elementRef);
    this.editableArea.appendChild(this.tablet);
    this.dashboard.appendChild(this.editableArea);
    this.dashboard.appendChild(this.componentStage.elementRef);
    this.elementRef.appendChild(this.dashboard);

    const loading = this.loading;
    loading.classList.add('textbus-workbench-loading');
    loading.innerHTML = `
    <div>T</div>
    <div>e</div>
    <div>x</div>
    <div>t</div>
    <div>B</div>
    <div>U</div>
    <div>S</div>
    `;
    this.editableArea.appendChild(loading);
    const sub = this.viewer.onReady.subscribe(() => {
      this.tablet.appendChild(this.viewer.input.elementRef);
      this.viewer.setMinHeight(this.editableArea.offsetHeight);
      sub.unsubscribe();
    })
  }

  dialog(element: HTMLElement) {
    this.dialogWrapper.innerHTML = '';
    this.dialogWrapper.appendChild(element);
    this.dialogBg.classList.add('textbus-dialog-active');
    setTimeout(() => {
      this.dialogWrapper.classList.add('textbus-dialog-wrapper-active');
    }, 200)
  }

  close() {
    this.dialogWrapper.classList.remove('textbus-dialog-wrapper-active');
    setTimeout(() => {
      this.dialogBg.classList.remove('textbus-dialog-active');
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

  loaded() {
    setTimeout(() => {
      this.loading.classList.add('textbus-workbench-loading-done');
      this.tablet.classList.add('textbus-tablet-ready');
      setTimeout(() => {
        this.editableArea.removeChild(this.loading);
      }, 300);
    }, 1000)
  }
}
