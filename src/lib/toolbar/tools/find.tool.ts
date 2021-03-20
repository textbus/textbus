import { fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';

import { AdditionalToolConfig, AdditionalViewer, Toolkit } from '../toolkit/_api';
import { FindCommander } from '../commands/find.commander';

export interface FindAndReplaceRule {
  findValue: string;
  next: boolean;
  replaceValue: string;
  replace: boolean;
  replaceAll: boolean;
}

class FindForm implements AdditionalViewer {
  onAction: Observable<FindAndReplaceRule>;
  onDestroy: Observable<void>;
  elementRef = document.createElement('form');
  private actionEvent = new Subject<FindAndReplaceRule>();
  private destroyEvent = new Subject<void>();

  constructor() {
    this.onAction = this.actionEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
    this.elementRef.classList.add('textbus-form', 'textbus-form-inline');
    this.elementRef.innerHTML = `
<div class="textbus-form-group">
  <label class="textbus-control-label">查找</label>
  <div class="textbus-control-value">
    <input type="text" class="textbus-form-control" placeholder="请输入查找内容">
  </div>
  <div>
    &nbsp;<button class="textbus-btn textbus-btn-default" type="button">下一个</button>   
  </div>
</div>
<div class="textbus-form-group">
  <label class="textbus-control-label">替换</label>
  <div class="textbus-control-value">
    <div class="textbus-input-group">
      <input type="text" class="textbus-form-control" placeholder="替换成">
      <button class="textbus-btn textbus-btn-default" type="button">替换</button>
    </div>
  </div>
  <div>
    &nbsp;<button class="textbus-btn textbus-btn-default" type="button">全部替换</button>
  </div>
</div>
`;
    const [findInput, replaceInput] = Array.from(this.elementRef.querySelectorAll('input'));
    const [nextBtn, replaceBtn, replaceAllBtn] = Array.from(this.elementRef.querySelectorAll('button'));

    nextBtn.disabled = replaceBtn.disabled = replaceAllBtn.disabled = true;
    fromEvent(findInput, 'input').pipe(tap(() => {
      nextBtn.disabled = replaceBtn.disabled = replaceAllBtn.disabled = !findInput.value;
    }), distinctUntilChanged(), debounceTime(200)).subscribe(() => {
      this.actionEvent.next({
        findValue: findInput.value,
        next: false,
        replaceAll: false,
        replace: false,
        replaceValue: ''
      })
    })
    nextBtn.addEventListener('click', () => {
      this.actionEvent.next({
        findValue: findInput.value,
        next: true,
        replaceAll: false,
        replace: false,
        replaceValue: ''
      })
    })
    replaceBtn.addEventListener('click', () => {
      this.actionEvent.next({
        findValue: findInput.value,
        next: false,
        replaceAll: false,
        replace: true,
        replaceValue: replaceInput.value
      })
    })
    replaceAllBtn.addEventListener('click', () => {
      this.actionEvent.next({
        findValue: findInput.value,
        next: false,
        replaceAll: true,
        replace: false,
        replaceValue: replaceInput.value
      })
    })
  }

  destroy() {
    this.actionEvent.next({
      findValue: '',
      next: false,
      replaceAll: false,
      replace: false,
      replaceValue: ''
    });
    this.actionEvent.complete();
    this.destroyEvent.next();
    this.destroyEvent.complete();
  }
}

export const findToolConfig: AdditionalToolConfig = {
  tooltip: '查找与替换',
  iconClasses: ['textbus-icon-search'],
  keymap: {
    ctrlKey: true,
    key: 'f'
  },
  menuFactory(): AdditionalViewer {
    return new FindForm();
  },
  commanderFactory() {
    return new FindCommander()
  },
};
export const findTool = Toolkit.makeAdditionalTool(findToolConfig);
