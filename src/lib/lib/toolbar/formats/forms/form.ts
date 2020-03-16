import { Observable, Subject } from 'rxjs';

import { FormItem, AttrType, AttrState, AttrConfig } from './help';
import { FormTextField } from './form-text-field';
import { FormOptions } from './form-options';
import { FormSwitch } from './form-switch';
import { FormHidden } from './form-hidden';
import { EventDelegate } from '../../help';
import { DropdownHandlerView } from '../../handlers/utils/dropdown';
import { AbstractData } from '../../../parser/abstract-data';
import { tap } from 'rxjs/operators';

export class Form implements DropdownHandlerView {
  onSubmit: (attrs: AttrState[]) => void;
  freezeState: Observable<boolean>;
  readonly elementRef = document.createElement('form');
  private items: FormItem[] = [];
  private delegator: EventDelegate;
  private freezeStateSource = new Subject<boolean>();

  constructor(forms: Array<AttrConfig>) {
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
      if (typeof this.onSubmit === 'function') {
        this.onSubmit(this.items.map(item => {
          return item.getAttr();
        }));
      }
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

  update(d: AbstractData): void {
    this.items.forEach(item => {
      item.update((d && d.attrs) ? d.attrs.get(item.name) : '');
    });
  }
}
