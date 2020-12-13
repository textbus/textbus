import { forwardRef, Inject, Injectable } from '@tanbo/di';

import { ComponentStage } from './component-stage';
import { Viewer } from './viewer';
import { Device } from './device';
import { createElement } from '../uikit/uikit';
import { EditorController } from '../editor-controller';
import { EDITOR_OPTIONS, EditorOptions } from '../editor';

export abstract class DialogManager {
  abstract dialog(content: HTMLElement): void;

  abstract close(): void;
}

@Injectable()
export class Workbench implements DialogManager {
  elementRef: HTMLElement;
  readonly tablet: HTMLElement;

  private dialogBg: HTMLElement;
  private dialogWrapper: HTMLElement;
  private editableArea: HTMLElement;
  private loading = document.createElement('div');

  constructor(@Inject(forwardRef(() => Device)) private device: Device,
              @Inject(forwardRef(() => ComponentStage)) private componentStage: ComponentStage,
              @Inject(forwardRef(() => EditorController)) private editorController: EditorController,
              @Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              @Inject(forwardRef(() => Viewer)) private viewer: Viewer) {
    this.elementRef = createElement('div', {
      classes: ['textbus-workbench'],
      children: [
        createElement('div', {
          classes: ['textbus-additional-worktable'],
          children: [
            this.dialogBg = createElement('div', {
              classes: ['textbus-dialog'],
              children: [
                this.dialogWrapper = createElement('div', {
                  classes: ['textbus-dialog-wrapper']
                })
              ]
            })
          ]
        }),
        createElement('div', {
          classes: ['textbus-dashboard'],
          children: [
            this.editableArea = createElement('div', {
              classes: ['textbus-editable-area'],
              children: [
                this.tablet = createElement('div', {
                  classes: ['textbus-tablet'],
                  children: [this.viewer.elementRef]
                })
              ]
            }),
            this.componentStage.elementRef
          ]
        })
      ]
    })

    const loading = this.loading;
    loading.classList.add('textbus-workbench-loading');
    loading.innerHTML = 'TextBus'.split('').map(t => `<div>${t}</div>`).join('');
    this.editableArea.appendChild(loading);

    this.editorController.onStateChange.subscribe(value => {
      for (const item of (this.options.deviceOptions || [])) {
        if (value.deviceType === item.label) {
          this.setTabletWidth(item.value);
        }
      }
    })

    this.viewer.onReady.subscribe(() => {
      this.loaded()
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

  private loaded() {
    this.viewer.setMinHeight(this.editableArea.offsetHeight);
    setTimeout(() => {
      this.loading.classList.add('textbus-workbench-loading-done');
      this.tablet.classList.add('textbus-tablet-ready');
      setTimeout(() => {
        this.editableArea.removeChild(this.loading);
      }, 300);
    }, 1000)
  }

  private setTabletWidth(width: string) {
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
