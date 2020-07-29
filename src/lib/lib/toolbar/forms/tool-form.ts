import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ToolFormItem, AttrType, AttrState, AttrConfig } from './help';
import { ToolFormTextField } from './tool-form-text-field';
import { ToolFormOptions } from './tool-form-options';
import { ToolFormSwitch } from './tool-form-switch';
import { ToolFormHidden } from './tool-form-hidden';
import { EventDelegate } from '../help';
import { DropdownViewer } from '../toolkit/_api';
import { FormatAbstractData, BranchComponent, LeafComponent } from '../../core/_api';

export class ToolForm implements DropdownViewer {
  onComplete: Observable<AttrState[]>;
  freezeState: Observable<boolean>;
  readonly elementRef = document.createElement('form');
  private items: ToolFormItem[] = [];
  private delegator: EventDelegate;
  private freezeStateSource = new Subject<boolean>();
  private completeEvent = new Subject<AttrState[]>();

  constructor(forms: Array<AttrConfig>) {
    this.onComplete = this.completeEvent.asObservable();
    this.freezeState = this.freezeStateSource.asObservable();
    this.elementRef.classList.add('tbus-form', 'tbus-form-flow', 'tbus-form-tool');
    forms.forEach(attr => {
      switch (attr.type) {
        case AttrType.TextField:
          this.items.push(new ToolFormTextField(attr, (type: string) => {
            this.freezeStateSource.next(true);
            return this.delegator.dispatchEvent(type).pipe(tap(() => {
              this.freezeStateSource.next(false);
            }));
          }));
          break;
        case AttrType.Options:
          this.items.push(new ToolFormOptions(attr));
          break;
        case AttrType.Switch:
          this.items.push(new ToolFormSwitch(attr));
          break;
        case AttrType.Hidden:
          this.items.push(new ToolFormHidden(attr));
          break
      }
    });
    this.items.forEach(item => {
      this.elementRef.appendChild(item.elementRef);
    });

    this.elementRef.setAttribute('novalidate', 'novalidate');

    const btnWrap = document.createElement('div');
    btnWrap.classList.add('tbus-btn-wrap');
    btnWrap.innerHTML = '<button class="tbus-btn tbus-btn-block tbus-btn-primary" type="submit">确定</button>';

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
      if (item instanceof ToolFormTextField) {
        item.update('');
      } else if (item instanceof ToolFormOptions) {
        item.update(Number.NaN);
      } else if (item instanceof ToolFormSwitch) {
        item.update();
      }
    });
  }

  setEventDelegator(delegate: EventDelegate): void {
    this.delegator = delegate;
  }

  update(d: FormatAbstractData | BranchComponent | LeafComponent): void {
    this.items.forEach(item => {
      const value = d ? d instanceof FormatAbstractData ? d.attrs.get(item.name) : d[item.name] : null;
      item.update(value);
    });
  }
}
