import { fromEvent, Observable, Subscription } from 'rxjs';
import { Inject, Injectable, InjectionToken } from '@tanbo/di';

import {
  AbstractComponent, BackboneAbstractComponent, BranchAbstractComponent,
  DivisionAbstractComponent,
  LeafAbstractComponent, TBRangePosition,
  TBSelection,
  BrComponent
} from '../../core/_api';
import { UIDialog } from '../plugins/dialog.plugin';
import { EditorController } from '../../editor-controller';
import { FileUploader } from '../file-uploader';
import { createElement, createTextNode } from '../uikit/uikit';
import { Tab } from '../tab';
import { TBPlugin } from '../plugin';
import { Layout } from '../layout';
import { I18n, I18nString } from '../../i18n';

export interface ComponentCreator {
  example: string | HTMLElement;
  name: I18nString;
  category?: I18nString;

  factory(dialog: UIDialog, delegate: FileUploader, i18n: I18n): AbstractComponent | Promise<AbstractComponent> | Observable<AbstractComponent>;
}

export class LibSwitch {
  btn = createElement('button', {
    attrs: {
      type: 'button',
      title: this.i18n.get('plugins.componentStage.expandOrNarrowLib'),
    },
    classes: ['textbus-status-bar-btn'],
    children: [
      createElement('span', {
        classes: ['textbus-icon-components']
      }),
      createTextNode(this.i18n.get('plugins.componentStage.switchText'))
    ]
  }) as HTMLButtonElement;
  elementRef = createElement('div', {
    classes: ['textbus-lib-switch'],
    children: [
      this.btn
    ]
  });

  set expand(b: boolean) {
    this._expand = b;
    this.callback(b);
    if (b) {
      this.elementRef.classList.add('textbus-status-bar-btn-active');
    } else {
      this.elementRef.classList.remove('textbus-status-bar-btn-active');
    }
  }

  get expand() {
    return this._expand;
  }

  private _expand = false;

  private subs: Subscription[] = [];

  constructor(private callback: (b: boolean) => void, private i18n: I18n) {
    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.expand = !this.expand;
      })
    )
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}

export const COMPONENT_CREATORS = new InjectionToken<ComponentCreator[]>('COMPONENT_CREATORS');

@Injectable()
export class ComponentStagePlugin implements TBPlugin {
  switch = new LibSwitch((b: boolean) => {
    this.expand = b;
  }, this.i18n);
  private elementRef: HTMLElement;

  private set expand(b: boolean) {
    this._expand = b;
    b ?
      this.elementRef.classList.add('textbus-component-stage-expand') :
      this.elementRef.classList.remove('textbus-component-stage-expand');
  }

  private _expand = false;

  private subs: Subscription[] = [];

  constructor(@Inject(COMPONENT_CREATORS) private creators: ComponentCreator[],
              private i18n: I18n,
              private editorController: EditorController,
              private fileUploader: FileUploader,
              private dialogManager: UIDialog,
              private selection: TBSelection,
              private layout: Layout) {

  }

  setup() {
    const categories = this.classify(this.creators || []);
    const tab = new Tab();
    tab.show(categories.map(item => {
      const view = createElement('div', {
        classes: ['textbus-component-stage-list']
      });
      item.libs.forEach(i => view.appendChild(this.addExample(i)))
      return {
        label: item.categoryName,
        view
      }
    }))
    this.elementRef = createElement('div', {
      classes: ['textbus-component-stage'],
      children: [
        tab.elementRef
      ]
    })
    this.layout.rightContainer.appendChild(this.elementRef);
    this.layout.bottomBar.appendChild(this.switch.elementRef);
    this.subs.push(this.editorController.onStateChange.subscribe(state => {
      this.switch.btn.disabled = state.readonly || state.sourcecodeMode;
    }))
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
    this.switch.onDestroy();
  }

  private classify(libs: ComponentCreator[]) {
    const categories = new Map<string, ComponentCreator[]>();
    libs.forEach(item => {
      const category = typeof item.category === 'function' ? item.category(this.i18n) : item.category;
      const categoryName = category || this.i18n.get('plugins.componentStage.defaultCategoryName');
      if (!categories.has(categoryName)) {
        categories.set(categoryName, []);
      }
      const list = categories.get(categoryName);
      list.push(item);
    })
    return Array.from(categories).map(value => {
      return {
        categoryName: value[0],
        libs: value[1]
      }
    });
  }

  private insertComponent(component: AbstractComponent) {
    if (this.editorController.readonly || !this.selection.rangeCount) {
      return;
    }
    const firstRange = this.selection.firstRange;
    const startFragment = firstRange.startFragment;
    const parentComponent = startFragment.parentComponent;
    if (component instanceof LeafAbstractComponent && !component.block) {
      startFragment.insert(component, firstRange.endIndex);
    } else {
      if (parentComponent instanceof DivisionAbstractComponent) {
        const parentFragment = parentComponent.parentFragment;
        if (!parentFragment) {
          startFragment.insert(component, firstRange.startIndex);
          return;
        }
        const firstContent = startFragment.getContentAtIndex(0);
        parentFragment.insertAfter(component, parentComponent);
        if (!firstContent || startFragment.length === 1 && firstContent instanceof BrComponent) {
          const index = parentFragment.indexOf(parentComponent);
          parentFragment.cut(index, index + 1);
        }
      } else if (parentComponent instanceof BranchAbstractComponent &&
        startFragment.length === 1 &&
        startFragment.getContentAtIndex(0) instanceof BrComponent) {
        startFragment.clean();
        startFragment.append(component);
      } else {
        startFragment.insert(component, firstRange.endIndex);
      }
    }
    let position: TBRangePosition;
    if (component instanceof DivisionAbstractComponent) {
      position = firstRange.findFirstPosition(component.slot);
    } else if (component instanceof BranchAbstractComponent) {
      position = firstRange.findFirstPosition(component.slots[0]);
    } else if (component instanceof BackboneAbstractComponent) {
      position = firstRange.findFirstPosition(component.getSlotAtIndex(0))
    } else {
      position = {
        fragment: component.parentFragment,
        index: component.parentFragment.indexOf(component)
      }
    }
    firstRange.setStart(position.fragment, position.index);
    firstRange.collapse();
    // this.selection.removeAllRanges(true);
  }

  private addExample(example: ComponentCreator) {
    const name = typeof example.name === 'function' ? example.name(this.i18n) : example.name
    const {wrapper, card} = ComponentStagePlugin.createViewer(example.example, name);
    card.addEventListener('click', () => {
      if (this.editorController.readonly || this.editorController.sourceCodeMode) {
        return;
      }
      const t = example.factory(this.dialogManager, this.fileUploader, this.i18n);
      if (t instanceof AbstractComponent) {
        this.insertComponent(t);
      } else if (t instanceof Promise) {
        t.then(instance => {
          this.insertComponent(instance);
        });
      } else if (t instanceof Observable) {
        const sub = t.subscribe(instance => {
          this.insertComponent(instance);
          sub.unsubscribe();
        })
      }
    });
    return wrapper;
  }

  private static createViewer(content: string | HTMLElement, name: string) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('textbus-component-example-item');
    const card = document.createElement('div');
    card.classList.add('textbus-component-example');

    const exampleContent = document.createElement('div');
    exampleContent.classList.add('textbus-component-example-content');

    if (typeof content === 'string') {
      exampleContent.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      exampleContent.appendChild(content);
    }

    card.appendChild(exampleContent);

    const mask = document.createElement('div');
    mask.classList.add('textbus-component-example-mask');
    card.appendChild(mask);

    wrapper.appendChild(card);
    const nameWrapper = document.createElement('div');
    nameWrapper.classList.add('textbus-component-example-name');
    nameWrapper.innerText = name || '';
    wrapper.appendChild(nameWrapper);
    return {
      wrapper,
      card
    };
  }
}
