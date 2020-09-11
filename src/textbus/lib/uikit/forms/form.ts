import { Observable, Subject } from 'rxjs';

import { FormItem, FileUploader } from './help';
import { FormViewer } from '../../toolbar/toolkit/_api';
import { FormatAbstractData, BranchComponent, LeafComponent } from '../../core/_api';
import { createElement, createTextNode } from '../uikit';

export interface FormConfig {
  title?: string;
  items: FormItem[];
  mini?: boolean;
}

export class Form implements FormViewer {
  onComplete: Observable<Map<string, any>>;
  onClose: Observable<void>;

  readonly elementRef = createElement('form', {
    attrs: {
      novalidate: true,
      autocomplete: 'off'
    }
  });
  private completeEvent = new Subject<Map<string, any>>();
  private closeEvent = new Subject<void>();

  constructor(private config: FormConfig) {
    this.onComplete = this.completeEvent.asObservable();
    this.onClose = this.closeEvent.asObservable();
    this.elementRef.classList.add(config.mini ? 'textbus-toolbar-form' : 'textbus-form');
    if (config.title) {
      this.elementRef.appendChild(createElement('h3', {
        classes: ['textbus-form-title'],
        children: [createTextNode(config.title)]
      }))
    }
    if (config.mini) {
      config.items.forEach(item => {
        this.elementRef.appendChild(item.elementRef);
      });
    } else {
      this.elementRef.appendChild(createElement('div', {
        classes: ['textbus-form-body'],
        children: config.items.map(item => {
          return item.elementRef;
        })
      }));
    }

    this.elementRef.setAttribute('novalidate', 'novalidate');

    const btns = config.mini ? [
      createElement('button', {
        attrs: {
          type: 'submit'
        },
        classes: ['textbus-btn', 'textbus-btn-block', 'textbus-btn-primary'],
        children: [createTextNode('确定')]
      })
    ] : [
      createElement('button', {
        attrs: {
          type: 'submit'
        },
        classes: ['textbus-btn', 'textbus-btn-primary'],
        children: [createTextNode('确定')]
      }),
      (() => {
        const cancelBtn = createElement('button', {
          classes: ['textbus-btn', 'textbus-btn-default'],
          attrs: {
            type: 'button'
          },
          children: [createTextNode('取消')]
        })
        cancelBtn.addEventListener('click', () => {
          this.closeEvent.next();
        })
        return cancelBtn;
      })()
    ];
    this.elementRef.appendChild(createElement('div', {
      classes: ['textbus-form-footer'],
      children: btns
    }));

    this.elementRef.addEventListener('submit', (ev: Event) => {
      ev.preventDefault();

      const map = new Map<string, any>();
      for (const item of config.items) {
        if (!item.validate()) {
          return;
        }
        const i = item.getAttr();
        map.set(i.name, i.value);
      }
      this.completeEvent.next(map);
    });
  }

  reset(): void {
    this.config.items.forEach(item => {
      item.reset();
    });
  }

  setFileUploader(fileUploader: FileUploader): void {
    this.config.items.forEach(item => {
      if (typeof item.useUploader === 'function') {
        item.useUploader(fileUploader);
      }
    })
  }

  update(d: FormatAbstractData | BranchComponent | LeafComponent): void {
    this.config.items.forEach(item => {
      const value = d ? d instanceof FormatAbstractData ? d.attrs.get(item.name) : d[item.name] : null;
      item.update(value);
    });
  }
}
