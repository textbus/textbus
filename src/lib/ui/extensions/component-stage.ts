import { fromEvent, Observable, Subscription } from 'rxjs';
import { Injector, Type } from '@tanbo/di';

import {
  AbstractComponent, BackboneAbstractComponent, BranchAbstractComponent,
  DivisionAbstractComponent,
  LeafAbstractComponent, TBRangePosition,
  TBSelection,
  BrComponent
} from '../../core/_api';
import { Dialog } from '../dialog';
import { FileUploader } from '../uikit/forms/help';
import { EditorController } from '../../editor-controller';
import { UI_BOTTOM_CONTAINER, UI_RIGHT_CONTAINER } from '../../inject-tokens';
import { createElement, createTextNode } from '../uikit/uikit';
import { Tab } from './tab';
import { TextBusUI } from '../../ui';

export interface ComponentCreator {
  example: string | HTMLElement;
  name: string;
  category?: string;

  factory(dialog: Dialog, delegate: FileUploader): AbstractComponent | Promise<AbstractComponent> | Observable<AbstractComponent>;
}

export class LibSwitch {
  elementRef = createElement('button', {
    attrs: {
      type: 'button',
      title: '展开或收起组件库',
    },
    classes: ['textbus-status-bar-btn', 'textbus-lib-switch-btn'],
    children: [
      createElement('span', {
        classes: ['textbus-icon-components']
      }),
      createTextNode(' 组件库')
    ]
  }) as HTMLButtonElement;

  set expand(b: boolean) {
    this._expand = b;
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

  constructor(private callback: (b: boolean) => void) {
    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.expand = !this.expand;
        this.callback(this.expand);
      })
    )
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}

export class ComponentStage implements TextBusUI {
  private switch = new LibSwitch((b: boolean) => {
    this.expand = b;
  });
  private elementRef: HTMLElement;

  private set expand(b: boolean) {
    this._expand = b;
    b ?
      this.elementRef.classList.add('textbus-component-stage-expand') :
      this.elementRef.classList.remove('textbus-component-stage-expand');
  }

  private _expand = false;
  private selection: TBSelection;
  private editorController: EditorController;
  private fileUploader: FileUploader;
  private dialogManager: Dialog;

  constructor(private creators: ComponentCreator[]) {
  }

  setup(injector: Injector) {
    this.editorController = injector.get(EditorController);
    this.fileUploader = injector.get(FileUploader as Type<FileUploader>);
    this.dialogManager = injector.get(Dialog);
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
    injector.get(UI_RIGHT_CONTAINER).appendChild(this.elementRef);
    injector.get(UI_BOTTOM_CONTAINER).appendChild(this.switch.elementRef);
  }

  onReady(injector: Injector) {
    this.selection = injector.get(TBSelection);
  }

  onDestroy() {
    this.switch.onDestroy();
  }

  private classify(libs: ComponentCreator[]) {
    const categories = new Map<string, ComponentCreator[]>();
    libs.forEach(item => {
      const categoryName = item.category || '默认';
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
    const {wrapper, card} = ComponentStage.createViewer(example.example, example.name);
    card.addEventListener('click', () => {
      const t = example.factory(this.dialogManager, this.fileUploader);
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
