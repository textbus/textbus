import { forwardRef, Inject, Injectable } from '@tanbo/di';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { ComponentStage } from './component-stage';
import { Viewer } from './viewer';
import { Device } from './device';
import { createElement } from '../uikit/uikit';
import { EditorController } from '../editor-controller';
import { EDITOR_OPTIONS, EditorOptions } from '../editor';
import { Dialog } from './dialog';

@Injectable()
export class Workbench {
  elementRef: HTMLElement;
  readonly tablet: HTMLElement;
  readonly tabletWrapper: HTMLElement;
  readonly editableArea: HTMLElement;
  private loading = document.createElement('div');
  private subs: Subscription[] = [];

  constructor(@Inject(forwardRef(() => Device)) private device: Device,
              @Inject(forwardRef(() => ComponentStage)) private componentStage: ComponentStage,
              @Inject(forwardRef(() => EditorController)) private editorController: EditorController,
              @Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              @Inject(forwardRef(() => Dialog)) private dialog: Dialog,
              @Inject(forwardRef(() => Viewer)) private viewer: Viewer) {
    this.elementRef = createElement('div', {
      classes: ['textbus-workbench'],
      children: [
        createElement('div', {
          classes: ['textbus-additional-worktable'],
          children: [
            this.dialog.elementRef
          ]
        }),
        createElement('div', {
          classes: ['textbus-dashboard'],
          children: [
            this.editableArea = createElement('div', {
              classes: ['textbus-editable-area'],
              children: [
                this.tabletWrapper = createElement('div', {
                  classes: ['textbus-tablet-wrapper'],
                  children: [
                    this.tablet = createElement('div', {
                      classes: ['textbus-tablet'],
                      children: [this.viewer.elementRef]
                    })
                  ]
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

    this.subs.push(
      this.editorController.onStateChange.pipe(map(s => {
        return s.deviceType;
      }), distinctUntilChanged()).subscribe(t => {
        for (const item of (this.options.deviceOptions || [])) {
          if (t === item.label) {
            this.setTabletWidth(item.value);
          }
        }
      }),
      this.editorController.onStateChange.pipe(map(s => {
        return s.sourceCodeMode;
      }), distinctUntilChanged()).subscribe(b => {
        this.tabletWrapper.style.padding = b ? '0' : '';
      }),
      this.viewer.onReady.subscribe(() => {
        this.loaded()
      })
    )
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loaded() {
    this.viewer.setMinHeight(this.editableArea.offsetHeight);
    setTimeout(() => {
      this.loading.classList.add('textbus-workbench-loading-done');
      this.tabletWrapper.classList.add('textbus-tablet-ready');
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
    this.tabletWrapper.style.width = width;
  }
}
