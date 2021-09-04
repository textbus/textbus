import { fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap } from 'rxjs/operators';
import { I18n } from '@textbus/core';

import { AdditionalTool, AdditionalToolConfig, AdditionalViewer } from '../toolkit/_api';
import { FindCommander, FindAndReplaceRule } from '../commands/find.commander';

class FindForm implements AdditionalViewer {
  onAction: Observable<FindAndReplaceRule>;
  onDestroy: Observable<void>;
  elementRef = document.createElement('form');
  private actionEvent = new Subject<FindAndReplaceRule>();
  private destroyEvent = new Subject<void>();

  constructor(i18n: I18n) {
    const childI18n = i18n.getContext('plugins.toolbar.findTool.view')
    this.onAction = this.actionEvent.asObservable();
    this.onDestroy = this.destroyEvent.asObservable();
    this.elementRef.classList.add('textbus-form', 'textbus-form-inline');
    this.elementRef.innerHTML = `
<div class="textbus-form-group">
  <label class="textbus-control-label">${childI18n.get('findLabel')}</label>
  <div class="textbus-control-value">
    <input type="text" class="textbus-form-control" placeholder="${childI18n.get('findPlaceholder')}">
  </div>
  <div>
    &nbsp;<button class="textbus-btn textbus-btn-default" type="button">${childI18n.get('nextBtnText')}</button>
  </div>
</div>
<div class="textbus-form-group">
  <label class="textbus-control-label">${childI18n.get('replaceLabel')}</label>
  <div class="textbus-control-value">
    <div class="textbus-input-group">
      <input type="text" class="textbus-form-control" placeholder="${childI18n.get('replacePlaceholder')}">
      <button class="textbus-btn textbus-btn-default" type="button">${childI18n.get('replaceBtnText')}</button>
    </div>
  </div>
  <div>
    &nbsp;<button class="textbus-btn textbus-btn-default" type="button">${childI18n.get('replaceAllBtnText')}</button>
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
  tooltip: i18n => i18n.get('plugins.toolbar.findTool.tooltip'),
  iconClasses: ['textbus-icon-search'],
  keymap: {
    ctrlKey: true,
    key: 'f'
  },
  viewFactory(i18n): AdditionalViewer {
    return new FindForm(i18n);
  },
  commanderFactory() {
    return new FindCommander()
  },
};
export const findTool = new AdditionalTool(findToolConfig);
