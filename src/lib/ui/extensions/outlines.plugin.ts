import { Injectable } from '@tanbo/di';
import { fromEvent, Subscription } from 'rxjs';

import { TBPlugin } from '../plugin';
import { Layout } from '../layout';
import { RootComponent } from '../../root-component';
import {
  AbstractComponent,
  BackboneAbstractComponent,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  Renderer
} from '../../core/_api';
import { BlockComponent } from '../../components/block.component';
import { createElement, createTextNode } from '../uikit/_api';
import { EditorController } from '../../editor-controller';
import { sampleTime } from 'rxjs/operators';
import { I18n } from '../../i18n';

@Injectable()
export class OutlinesPlugin implements TBPlugin {
  static defaultExpand = false;
  private subs: Subscription[] = [];

  private set expand(b: boolean) {
    this._expand = b;
    if (b) {
      this.btn.classList.add('textbus-status-bar-btn-active');
      this.container.style.display = 'block';
      this.container.style.width = this.layout.dashboard.offsetWidth * 0.2 + 'px';
    } else {
      this.btn.classList.remove('textbus-status-bar-btn-active');
      this.container.style.display = 'none';
    }
  }

  private get expand() {
    return this._expand;
  }

  private _expand = false;
  private btn: HTMLButtonElement;
  private btnWrapper: HTMLElement;
  private container: HTMLElement;
  private links: HTMLElement;

  constructor(private layout: Layout,
              private i18n: I18n,
              private rootComponent: RootComponent,
              private editorController: EditorController,
              private renderer: Renderer) {
    this.container = createElement('div', {
      classes: ['textbus-outlines-plugin'],
      children: [
        createElement('h3', {
          classes: ['textbus-outlines-plugin-title'],
          children: [
            createTextNode(this.i18n.get('plugins.outlines.title'))
          ]
        }),
        this.links = createElement('div', {
          classes: ['textbus-outlines-plugin-links']
        })
      ]
    });

    this.btnWrapper = createElement('div', {
      classes: ['textbus-outlines-plugin-btn-wrapper'],
      children: [
        this.btn = createElement('button', {
          classes: ['textbus-status-bar-btn'],
          attrs: {
            title: this.i18n.get('plugins.outlines.switchText')
          },
          children: [
            createElement('span', {
              classes: ['textbus-icon-tree']
            })
          ]
        }) as HTMLButtonElement
      ]
    })
  }

  setup() {
    this.subs.push(
      this.renderer.onViewUpdated.pipe(sampleTime(1000)).subscribe(() => {
        const components = this.getHeadingComponents()
        const headingNativeNodes = components.map(component => {
          return this.renderer.getComponentRootNativeNode(component)
        })
        const children = this.links.children;
        const count = Math.max(headingNativeNodes.length, children.length);
        for (let i = 0; i < count; i++) {
          const child = children[i];
          const h = headingNativeNodes[i];
          if (!h && child) {
            this.links.removeChild(child);
            continue;
          }
          if (child && h) {
            child.className = 'textbus-outlines-plugin-' + h.tagName.toLowerCase();
            const a = child.querySelector('a');
            a.onclick = () => {
              h.getBoundingClientRect()
              this.layout.scroller.scrollTo({
                top: this.getTopDistance(h)
              })
            }
            a.innerText = h.innerText;
          } else {
            const a = createElement('a', {
              attrs: {
                href: 'javascript:;'
              },
              children: [createTextNode(h.innerText)]
            });
            a.onclick = () => {
              h.getBoundingClientRect()
              this.layout.scroller.scrollTo({
                top: this.getTopDistance(h)
              })
            }
            const link = createElement('div', {
              classes: ['textbus-outlines-plugin-' + h.tagName.toLowerCase()],
              children: [a]
            });
            this.links.appendChild(link);
          }
        }
      }),
      fromEvent(this.btn, 'click').subscribe(() => {
        this.expand = !this.expand && !this.editorController.sourceCodeMode;
      }),
      this.editorController.onStateChange.subscribe(status => {
        this.btn.disabled = status.sourcecodeMode;
        if (status.sourcecodeMode) {
          this.expand = false;
        }
      })
    )
    this.layout.leftContainer.appendChild(this.container);
    this.layout.bottomBar.appendChild(this.btnWrapper);
    this.expand = OutlinesPlugin.defaultExpand;
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private getTopDistance(el: HTMLElement) {
    let i = el.offsetTop;
    while (el.offsetParent) {
      el = el.offsetParent as HTMLElement;
      i += el.offsetTop;
    }
    return i;
  }

  private getHeadingComponents() {
    const components: BlockComponent[] = [];

    function fn(component: AbstractComponent, result: BlockComponent[]) {
      if (component instanceof DivisionAbstractComponent) {
        if (component instanceof BlockComponent) {
          if (/h[1-6]/.test(component.tagName)) {
            result.push(component)
          }
        } else {
          component.slot.sliceContents().forEach(i => {
            if (typeof i === 'string') {
              return;
            }
            fn(i, result)
          })
        }
      } else if (component instanceof BranchAbstractComponent) {
        component.slots.forEach(slot => {
          slot.sliceContents().forEach((i: AbstractComponent | string) => {
            if (typeof i === 'string') {
              return;
            }
            fn(i, result)
          })
        })
      } else if (component instanceof BackboneAbstractComponent) {
        Array.from(component).forEach(slot => {
          slot.sliceContents().forEach((i: AbstractComponent | string) => {
            if (typeof i === 'string') {
              return;
            }
            fn(i, result)
          })
        })
      }
    }

    fn(this.rootComponent, components)
    return components;
  }
}
