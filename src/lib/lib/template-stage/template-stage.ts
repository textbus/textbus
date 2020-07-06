import { Observable, Subject } from 'rxjs';

import { Template } from '../core/_api';

export interface TemplateExample {
  example: string | HTMLElement;
  category?: string;

  templateFactory(): Template | Promise<Template> | Observable<Template>;
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

  constructor(examples: TemplateExample[] = []) {
    this.onCheck = this.checkEvent.asObservable();
    this.elementRef.classList.add('tbus-template-stage');
    this.templateListWrapper.classList.add('tbus-template-stage-list');
    this.elementRef.appendChild(this.templateListWrapper);
    examples.forEach(item => {
      this.addTemplate(item);
    });
  }

  private addTemplate(example: TemplateExample) {
    const view = TemplateStage.createViewer(example.example);
    view.addEventListener('click', () => {
      const t = example.templateFactory();
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

  private static createViewer(content: string | HTMLElement) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('tbus-template-example-item');
    const example = document.createElement('div');
    example.classList.add('tbus-template-example');
    if (typeof content === 'string') {
      example.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      example.appendChild(content);
    }
    wrapper.appendChild(example);
    const mask = document.createElement('div');
    mask.classList.add('tbus-template-example-mask');
    wrapper.appendChild(mask);
    return wrapper;
  }
}
