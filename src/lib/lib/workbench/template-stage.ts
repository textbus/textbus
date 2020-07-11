import { Observable, Subject } from 'rxjs';

import { Template } from '../core/_api';
import { Workbench } from './workbench';

export interface TemplateExample {
  example: string | HTMLElement;
  name: string;
  category?: string;

  templateFactory(workbench: Workbench): Template | Promise<Template> | Observable<Template>;
}

export class TemplateStage {
  onCheck: Observable<Template>;
  elementRef = document.createElement('div');

  set expand(b: boolean) {
    this._expand = b;
    b ?
      this.elementRef.classList.add('tbus-template-stage-expand') :
      this.elementRef.classList.remove('tbus-template-stage-expand');
  }

  get expand() {
    return this._expand;
  }

  private templateListWrapper = document.createElement('div');
  private _expand = false;
  private checkEvent = new Subject<Template>();

  constructor(private workbench: Workbench) {
    this.onCheck = this.checkEvent.asObservable();
    this.elementRef.classList.add('tbus-template-stage');
    this.templateListWrapper.classList.add('tbus-template-stage-list');
    this.elementRef.appendChild(this.templateListWrapper);
  }

  addTemplate(example: TemplateExample) {
    const view = TemplateStage.createViewer(example.example, example.name);
    view.addEventListener('click', () => {
      const t = example.templateFactory(this.workbench);
      if (t instanceof Template) {
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
    this.templateListWrapper.appendChild(view);
  }

  private static createViewer(content: string | HTMLElement, name: string) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tbus-template-example-item');
    const example = document.createElement('div');
    example.classList.add('tbus-template-example');

    const exampleContent = document.createElement('div');
    exampleContent.classList.add('tbus-template-example-content');

    if (typeof content === 'string') {
      exampleContent.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      exampleContent.appendChild(content);
    }

    example.appendChild(exampleContent);

    const mask = document.createElement('div');
    mask.classList.add('tbus-template-example-mask');
    example.appendChild(mask);

    wrapper.appendChild(example);
    const nameWrapper = document.createElement('div');
    nameWrapper.classList.add('tbus-template-example-name');
    nameWrapper.innerText = name || '';
    wrapper.appendChild(nameWrapper);
    return wrapper;
  }
}
