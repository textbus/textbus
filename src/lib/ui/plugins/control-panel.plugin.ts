import { Injectable } from '@tanbo/di';
import { Subscription } from 'rxjs';

import { createElement } from '../_utils/_api';
import { ComponentControlPanelView } from '../../core/_api';
import { EditorController } from '../../editor-controller';
import { Tab, TabConfig } from '../../../extensions/_utils/tab';
import { TBPlugin } from '../plugin';
import { Layout } from '../layout';
import { I18n } from '../../i18n';

@Injectable()
export class UIControlPanel implements TBPlugin {
  elementRef: HTMLElement;

  private container: HTMLElement;
  private fixedBtn: HTMLElement;

  private set fixed(b: boolean) {
    this._fixed = b;
    if (b) {
      this.layout.dashboard.insertBefore(this.elementRef, this.layout.rightContainer);
      this.elementRef.classList.add('textbus-control-panel-fixed');
      this.fixedBtn.classList.add('textbus-control-panel-fixed-btn-active');
      this.fixedBtn.title = this.i18n.get('editor.controlPanel.cancelFixed');
    } else {
      this.layout.viewer.append(this.elementRef);
      this.elementRef.classList.remove('textbus-control-panel-fixed');
      this.fixedBtn.classList.remove('textbus-control-panel-fixed-btn-active')
      this.fixedBtn.title = this.i18n.get('editor.controlPanel.fixed');
    }
  }

  private get fixed() {
    return this._fixed;
  }

  private _fixed = false;

  private subs: Subscription[] = [];

  private oldViews: ComponentControlPanelView[] = [];
  private tab = new Tab();

  constructor(private editorController: EditorController,
              private i18n: I18n,
              private layout: Layout) {
  }

  setup() {
    this.elementRef = createElement('div', {
      classes: ['textbus-control-panel'],
      children: [
        this.container = createElement('div', {
          classes: ['textbus-control-panel-container'],
          children: [
            this.tab.elementRef
          ]
        })
      ]
    })
    this.fixedBtn = createElement('button', {
      attrs: {
        type: 'button',
        title: this.i18n.get('editor.controlPanel.fixed')
      },
      classes: ['textbus-control-panel-fixed-btn'],
      children: [createElement('span', {
        classes: ['textbus-icon-pushpin']
      })]
    })
    this.fixedBtn.addEventListener('click', () => {
      this.fixed = !this.fixed;
    })
    this.tab.head.insertBefore(this.fixedBtn, this.tab.head.children[0]);
    this.subs.push(this.editorController.onStateChange.subscribe(status => {
      if (status.readonly) {
        this.fixed = false;
      }
    }))
    this.fixed = false;
  }

  showPanels(views: ComponentControlPanelView[]) {
    this.oldViews.forEach(view => {
      view.onDestroy?.()
    });
    this.oldViews = views;
    if (views.length === 0) {
      this.tab.show([]);
      this.elementRef.classList.remove('textbus-control-panel-show')
      return
    }
    this.elementRef.classList.add('textbus-control-panel-show');

    const tabs: TabConfig[] = views.map(view => {
      return {
        label: view.title,
        view: view.view
      }
    })
    this.tab.show(tabs);
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
