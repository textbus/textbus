import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

import { FormItem, AttrType, AttrState, AttrConfig } from './help';
import { FormTextField } from './form-text-field';
import { FormOptions } from './form-options';
import { FormSwitch } from './form-switch';
import { FormHidden } from './form-hidden';
import { EventDelegate } from '../help';
import { DropdownViewer } from '../toolkit/_api';
import { FormatAbstractData, BackboneTemplate, LeafTemplate } from '../../core/_api';

export class Form implements DropdownViewer {
  onComplete: Observable<AttrState[]>;
  freezeState: Observable<boolean>;
  readonly elementRef = document.createElement('form');
  private items: FormItem[] = [];
  private delegator: EventDelegate;
  private freezeStateSource = new Subject<boolean>();
  private completeEvent = new Subject<AttrState[]>();

  constructor(forms: Array<AttrConfig>) {
    this.onComplete = this.completeEvent.asObservable();
    this.freezeState = this.freezeStateSource.asObservable();
    this.elementRef.classList.add('tbus-form');
    forms.forEach(attr => {
      switch (attr.type) {
        case AttrType.TextField:
          this.items.push(new FormTextField(attr, (type: string) => {
            this.freezeStateSource.next(true);
            return this.delegator.dispatchEvent(type).pipe(tap(() => {
              this.freezeStateSource.next(false);
            }));
          }));
          break;
        case AttrType.Options:
          this.items.push(new FormOptions(attr));
          break;
        case AttrType.Switch:
          this.items.push(new FormSwitch(attr));
          break;
        case AttrType.Hidden:
          this.items.push(new FormHidden(attr));
          break
      }
    });
    this.items.forEach(item => {
      this.elementRef.appendChild(item.elementRef);
    });

    this.elementRef.setAttribute('novalidate', 'novalidate');

    const btnWrap = document.createElement('div');
    btnWrap.classList.add('tbus-form-btn-wrap');
    btnWrap.innerHTML = '<button class="tbus-form-submit" type="submit">确定</button>';

    this.elementRef.appendChild(btnWrap);

    this.elementRef.addEventListener('submit', (ev: Event) => {
      this.completeEvent.next(this.items.map(item => {
        return item.getAttr();
      }));
      ev.preventDefault();
    });
  }

  reset(): void {
    this.items.forEach(item => {
      if (item instanceof FormTextField) {
        item.update('');
      } else if (item instanceof FormOptions) {
        item.update(Number.NaN);
      } else if (item instanceof FormSwitch) {
        item.update();
      }
    });
  }

  setEventDelegator(delegate: EventDelegate): void {
    this.delegator = delegate;
  }

  update(d: FormatAbstractData | BackboneTemplate | LeafTemplate): void {
    this.items.forEach(item => {
      const value = d ? d instanceof FormatAbstractData ? d.attrs.get(item.name) : d[item.name] : null;
      item.update(value);
    });
  }
}
