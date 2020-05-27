import { merge, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

import { ActionSheetConfig, ActionConfig, HighlightState } from '../help';
import { Dropdown } from './utils/dropdown';
import { Handler, createKeymapHTML } from './help';
import { KeymapAction } from '../../viewer/input';

export class ActionSheetHandler implements Handler {
  readonly elementRef: HTMLElement;
  onMatched: Observable<ActionConfig>;
  onApply: Observable<any>;
  keymap: KeymapAction[] = [];

  private matchedEvent = new Subject<ActionConfig>();
  private options: ActionSheetOptionHandler[] = [];
  private eventSource = new Subject<any>();
  private dropdown: Dropdown;

  constructor(private config: ActionSheetConfig,
              private stickyElement: HTMLElement) {
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();

    const dropdownButton = document.createElement('span');
    dropdownButton.classList.add(...config.classes || []);

    const menu = document.createElement('div');
    menu.classList.add('tbus-toolbar-menu');

    config.actions.forEach(option => {
      const item = new ActionSheetOptionHandler(option);
      menu.appendChild(item.elementRef);
      this.options.push(item);
      if (option.keymap) {
        this.keymap.push({
          keymap: option.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              // config.execCommand.actionType = option.value;
              this.eventSource.next();
            }
          }
        })
      }
    });

    this.dropdown = new Dropdown(
      dropdownButton,
      menu,
      merge(...this.options.map(item => item.onCheck)).pipe(map(v => {
        // config.execCommand.actionType = v;
        this.eventSource.next();
        return v;
      })),
      config.tooltip,
      stickyElement
    );
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchDelta: any): void {
    switch (selectionMatchDelta.state) {
      case HighlightState.Highlight:
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        break;
      case HighlightState.Normal:
        this.dropdown.disabled = false;
        this.dropdown.highlight = false;
        break;
      case HighlightState.Disabled:
        this.dropdown.disabled = true;
        this.dropdown.highlight = false;
        break
    }
  }
}

export class ActionSheetOptionHandler {
  readonly elementRef = document.createElement('button');
  onCheck: Observable<any>;
  private eventSource = new Subject<any>();

  constructor(private option: ActionConfig) {
    this.onCheck = this.eventSource.asObservable();
    this.elementRef.classList.add('tbus-toolbar-menu-item');
    this.elementRef.type = 'button';
    const label = document.createElement('span');
    label.classList.add('tbus-toolbar-menu-item-label');
    if (option.classes) {
      label.classList.add(...(option.classes || []));
    }

    label.innerText = option.label;
    this.elementRef.appendChild(label);
    if (option.keymap) {
      const keymapHTML = document.createElement('span');
      keymapHTML.classList.add('tbus-toolbar-menu-item-keymap');
      keymapHTML.innerHTML = createKeymapHTML(option.keymap);
      this.elementRef.appendChild(keymapHTML);
    }
    this.elementRef.addEventListener('click', () => {
      this.eventSource.next(option.value);
    });
  }
}
