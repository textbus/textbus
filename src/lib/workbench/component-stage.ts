import { Observable, Subject } from 'rxjs';
import { Injectable } from '@tanbo/di';

import { AbstractComponent } from '../core/_api';
import { DialogManager } from './workbench';
import { FileUploader } from '../uikit/forms/help';
import { EditorController } from '../editor-controller';

export interface ComponentExample {
  example: string | HTMLElement;
  name: string;
  category?: string;

  componentFactory(workbench: DialogManager, delegate: FileUploader): AbstractComponent | Promise<AbstractComponent> | Observable<AbstractComponent>;
}

@Injectable()
export class ComponentStage {
  onCheck: Observable<AbstractComponent>;
  elementRef = document.createElement('div');

  set expand(b: boolean) {
    this._expand = b;
    b ?
      this.elementRef.classList.add('textbus-component-stage-expand') :
      this.elementRef.classList.remove('textbus-component-stage-expand');
  }

  get expand() {
    return this._expand;
  }

  private componentListWrapper = document.createElement('div');
  private _expand = false;
  private checkEvent = new Subject<AbstractComponent>();

  constructor(private fileUploader: FileUploader,
              private editorController: EditorController) {
    this.onCheck = this.checkEvent.asObservable();
    this.elementRef.classList.add('textbus-component-stage');
    this.componentListWrapper.classList.add('textbus-component-stage-list');
    this.elementRef.appendChild(this.componentListWrapper);

    editorController.onStateChange.subscribe(status => {
      this.expand = status.expandComponentLibrary;
    })
  }

  addExample(example: ComponentExample, dialogManager: DialogManager) {
    const {wrapper, card} = ComponentStage.createViewer(example.example, example.name);
    card.addEventListener('click', () => {
      const t = example.componentFactory(dialogManager, this.fileUploader);
      if (t instanceof AbstractComponent) {
        this.checkEvent.next(t);
      } else if (t instanceof Promise) {
        t.then(instance => {
          this.checkEvent.next(instance);
        });
      } else if (t instanceof Observable) {
        const sub = t.subscribe(instance => {
          this.checkEvent.next(instance);
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
