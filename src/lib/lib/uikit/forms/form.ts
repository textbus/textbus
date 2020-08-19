import { Observable, Subject } from 'rxjs';

import { FormItem, FormType, FormItemConfig, FileUploader } from './help';
import { FormTextField } from './form-text-field';
import { FormRadio } from './form-radio';
import { FormSwitch } from './form-switch';
import { FormHidden } from './form-hidden';
import { FormViewer } from '../../toolbar/toolkit/_api';
import { FormatAbstractData, BranchComponent, LeafComponent } from '../../core/_api';
import { createElement, createTextNode } from '../uikit';

export interface FormConfig {
  title?: string;
  items: FormItemConfig[];
  mini?: boolean;
}

export class Form implements FormViewer {
  onComplete: Observable<Map<string, any>>;
  onClose: Observable<void>;

  readonly elementRef = document.createElement('form');
  private items: FormItem[] = [];
  private fileUploader: FileUploader;
  private completeEvent = new Subject<Map<string, any>>();
  private closeEvent = new Subject<void>();

  constructor(config: FormConfig) {
    this.onComplete = this.completeEvent.asObservable();
    this.onClose = this.closeEvent.asObservable();
    this.elementRef.classList.add(config.mini ? 'textbus-toolbar-form' : 'textbus-form');
    config.items.forEach(attr => {
      switch (attr.type) {
        case FormType.TextField:
          this.items.push(new FormTextField(attr, (type: string) => {
            return this.fileUploader.upload(type);
          }));
          break;
        case FormType.Radio:
          this.items.push(new FormRadio(attr));
          break;
        case FormType.Switch:
          this.items.push(new FormSwitch(attr));
          break;
        case FormType.Hidden:
          this.items.push(new FormHidden(attr));
          break
      }
    });
    if (config.title) {
      this.elementRef.appendChild(createElement('h3', {
        classes: ['textbus-form-title'],
        children: [createTextNode(config.title)]
      }))
    }
    if (config.mini) {
      this.items.forEach(item => {
        this.elementRef.appendChild(item.elementRef);
      });
    } else {
      this.elementRef.appendChild(createElement('div', {
        classes: ['textbus-form-body'],
        children: this.items.map(item => {
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
      const map = new Map<string, any>();
      this.items.map(item => {
        const i = item.getAttr()
        map.set(i.name, i.value);
      })
      this.completeEvent.next(map);
      ev.preventDefault();
    });
  }

  reset(): void {
    this.items.forEach(item => {
      if (item instanceof FormTextField) {
        item.update('');
      } else if (item instanceof FormRadio) {
        item.update(Number.NaN);
      } else if (item instanceof FormSwitch) {
        item.update();
      }
    });
  }

  setFileUploader(fileUploader: FileUploader): void {
    this.fileUploader = fileUploader;
  }

  update(d: FormatAbstractData | BranchComponent | LeafComponent): void {
    this.items.forEach(item => {
      const value = d ? d instanceof FormatAbstractData ? d.attrs.get(item.name) : d[item.name] : null;
      item.update(value);
    });
  }
}
