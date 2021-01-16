import { Injectable } from '@tanbo/di';
import { createElement } from '../uikit/_api';
import { ComponentPresetPanelView } from '../core/component-setter';
import { EditorController } from '../editor-controller';
import { Subscription } from 'rxjs';

@Injectable()
export class ControlPanel {
  elementRef: HTMLElement;

  private container: HTMLElement;
  private titleGroup: HTMLElement;
  private viewWrapper: HTMLElement;
  private fixedBtn: HTMLElement;

  private set fixed(b: boolean) {
    this._fixed = b;
    if (b) {
      this.elementRef.classList.add('textbus-control-panel-fixed');
      this.fixedBtn.classList.add('textbus-control-panel-fixed-btn-active');
      this.fixedBtn.title = '取消固定';
    } else {
      this.elementRef.classList.remove('textbus-control-panel-fixed');
      this.fixedBtn.classList.remove('textbus-control-panel-fixed-btn-active')
      this.fixedBtn.title = '固定';
    }
  }

  private get fixed() {
    return this._fixed;
  }

  private _fixed = false;

  private subs: Subscription[] = [];

  constructor(private editorController: EditorController) {
    this.elementRef = createElement('div', {
      classes: ['textbus-control-panel'],
      children: [
        this.container = createElement('div', {
          classes: ['textbus-control-panel-container'],
          children: [
            createElement('div', {
              classes: ['textbus-control-panel-head'],
              children: [
                this.titleGroup = createElement('div', {
                  classes: ['textbus-control-panel-tab']
                }),

                this.fixedBtn = createElement('button', {
                  attrs: {
                    type: 'button',
                    title: '固定'
                  },
                  classes: ['textbus-control-panel-fixed-btn'],
                  children: [createElement('span', {
                    classes: ['textbus-icon-pushpin']
                  })]
                }),
              ]
            }),
            this.viewWrapper = createElement('div', {
              classes: ['textbus-control-panel-view']
            })
          ]
        })
      ]
    })

    this.fixedBtn.addEventListener('click', () => {
      this.fixed = !this.fixed;
    })

    this.subs.push(this.editorController.onStateChange.subscribe(status => {
      if (status.readonly || status.sourceCodeMode) {
        this.fixed = false;
      }
    }))
  }

  showPanels(views: ComponentPresetPanelView[]) {
    this.titleGroup.innerHTML = '';
    this.viewWrapper.innerHTML = '';
    if (views.length === 0) {
      this.elementRef.classList.remove('textbus-control-panel-show')
      return
    }
    this.elementRef.classList.add('textbus-control-panel-show')
    const btns: HTMLElement[] = views.map(view => {
      const btn = createElement('button', {
        classes: ['textbus-control-panel-tab-btn'],
        attrs: {
          type: 'button'
        },
        props: {
          innerText: view.title
        }
      });
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('textbus-control-panel-tab-btn-active'));
        btn.classList.add('textbus-control-panel-tab-btn-active');
        this.viewWrapper.innerHTML = '';
        this.viewWrapper.appendChild(view.view);
      })
      this.titleGroup.appendChild(btn);
      return btn;
    })
    this.viewWrapper.appendChild(views[0].view);

    btns[0].classList.add('textbus-control-panel-tab-btn-active');
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
