import { Observable, Subscription } from 'rxjs';
import { forwardRef, Inject, Injectable, Injector } from '@tanbo/di';

import {
  AbstractComponent, BranchAbstractComponent,
  DivisionAbstractComponent,
  Fragment,
  LeafAbstractComponent,
  TBSelection
} from '../core/_api';
import { Dialog } from './dialog';
import { FileUploader } from '../uikit/forms/help';
import { EditorController } from '../editor-controller';
import { EDITOR_OPTIONS, EditorOptions } from '../editor';
import { BrComponent } from '../components/br.component';

export interface ComponentExample {
  example: string | HTMLElement;
  name: string;
  category?: string;

  componentFactory(dialog: Dialog, delegate: FileUploader): AbstractComponent | Promise<AbstractComponent> | Observable<AbstractComponent>;
}

@Injectable()
export class ComponentStage {
  elementRef = document.createElement('div');

  private set expand(b: boolean) {
    this._expand = b;
    b ?
      this.elementRef.classList.add('textbus-component-stage-expand') :
      this.elementRef.classList.remove('textbus-component-stage-expand');
  }

  private componentListWrapper = document.createElement('div');
  private _expand = false;
  private selection: TBSelection;
  private subs: Subscription[] = [];

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              @Inject(forwardRef(() => Dialog)) private dialogManager: Dialog,
              private fileUploader: FileUploader,
              private editorController: EditorController) {
    this.elementRef.classList.add('textbus-component-stage');
    this.componentListWrapper.classList.add('textbus-component-stage-list');
    this.elementRef.appendChild(this.componentListWrapper);

    this.subs.push(editorController.onStateChange.subscribe(status => {
      this.expand = status.expandComponentLibrary;
    }));

    (this.options.componentLibrary || []).forEach(e => this.addExample(e))
  }

  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private insertComponent(component: AbstractComponent) {
    if (this.editorController.readonly || !this.selection.rangeCount) {
      return;
    }
    const firstRange = this.selection.firstRange;
    const startFragment = firstRange.startFragment;
    const parentComponent = startFragment.parentComponent;
    if (component instanceof LeafAbstractComponent) {
      startFragment.insert(component, firstRange.endIndex);
    } else {
      if (parentComponent instanceof DivisionAbstractComponent) {
        const parentFragment = parentComponent.parentFragment;
        const firstContent = startFragment.getContentAtIndex(0);
        parentFragment.insertAfter(component, parentComponent);
        if (!firstContent || startFragment.contentLength === 1 && firstContent instanceof BrComponent) {
          parentFragment.cut(parentFragment.indexOf(parentComponent), 1);
        }
      } else if (parentComponent instanceof BranchAbstractComponent) {
        const ff = new Fragment();
        ff.append(component);
        parentComponent.slots.splice(parentComponent.slots.indexOf(startFragment) + 1, 0, ff);
      } else {
        startFragment.insert(component, firstRange.endIndex);
      }
    }
    this.selection.removeAllRanges(true);
  }

  private addExample(example: ComponentExample) {
    const {wrapper, card} = ComponentStage.createViewer(example.example, example.name);
    card.addEventListener('click', () => {
      const t = example.componentFactory(this.dialogManager, this.fileUploader);
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
    this.componentListWrapper.appendChild(wrapper);
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
