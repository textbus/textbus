import { Injectable } from '@tanbo/di';

import {
  Component,
  ComponentLoader, ComponentSetter, ComponentControlPanelView,
  DivisionAbstractComponent,
  SlotRenderFn,
  VElement,
  ViewData, SingleSlotRenderFn
} from '../../lib/core/_api';
import {  UIDialog } from '../../lib/ui/_api';
import { BlockComponent } from '../../lib/components/_api';
import { FileUploader } from '../../lib/ui/_api';
import { ComponentCreator } from '../plugins/component-stage.plugin';
import { I18n } from '../../lib/i18n';
import { Form, FormTextField } from '../_utils/forms/_api';

export interface JumbotronOptions {
  minHeight: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

@Injectable()
class JumbotronComponentSetter implements ComponentSetter<JumbotronComponent> {
  constructor(private uploader: FileUploader,
              private i18n: I18n) {
  }

  create(instance: JumbotronComponent): ComponentControlPanelView {
    const childI18n = this.i18n.getContext('components.jumbotronComponent.setter');
    const form = new Form({
      mini: true,
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          name: 'minHeight',
          value: instance.options.minHeight,
          placeholder: childI18n.get('minHeightInputPlaceholder'),
          label: childI18n.get('minHeightLabel')
        }),
        new FormTextField({
          label: childI18n.get('backgroundImageLabel'),
          name: 'backgroundImage',
          placeholder: childI18n.get('backgroundImageInputPlaceholder'),
          canUpload: true,
          uploadType: 'image',
          uploadBtnText: childI18n.get('uploadBtnText'),
          value: instance.options.backgroundImage,
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('validateErrorMessage');
            }
            return null;
          }
        })
      ]
    })

    form.setFileUploader(this.uploader);

    form.onComplete.subscribe(map => {
      instance.options.minHeight = map.get('minHeight');
      instance.options.backgroundImage = map.get('backgroundImage');
      instance.slot.markAsDirtied();
    });
    return {
      title: childI18n.get('title'),
      view: form.elementRef
    }
  }
}

class JumbotronComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-jumbotron';
  }

  read(element: HTMLElement): ViewData {
    const style = element.style;
    const component = new JumbotronComponent({
      backgroundImage: (style.backgroundImage || '').replace(/^url\(['"]?|['"]?\)$/g, ''),
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      minHeight: style.minHeight
    });
    return {
      component: component,
      slotsMap: [{
        from: element,
        toSlot: component.slot
      }]
    };
  }
}

@Component({
  loader: new JumbotronComponentLoader(),
  providers: [{
    provide: ComponentSetter,
    useClass: JumbotronComponentSetter
  }],
  styles: [
    `
tb-jumbotron {
  display: block;
  min-height: 200px;
  margin-bottom: 1em;
  background-color: #eee;
  padding: 20px;
}
`
  ]
})
export class JumbotronComponent extends DivisionAbstractComponent {
  constructor(public options: JumbotronOptions) {
    super('tb-jumbotron');
  }

  clone(): JumbotronComponent {
    const component = new JumbotronComponent({
      ...this.options
    });
    component.slot.from(this.slot.clone());
    return component;
  }

  slotRender(isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    const vEle = <tb-jumbotron style={{
      backgroundImage: `url("${this.options.backgroundImage}")`,
      backgroundSize: this.options.backgroundSize || 'cover',
      backgroundPosition: this.options.backgroundPosition || 'center',
      minHeight: this.options.minHeight
    }}/>;
    return slotRendererFn(this.slot, vEle);
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn): VElement {
    return slotRendererFn(this.slot)
  }
}

export const jumbotronComponentExample: ComponentCreator = {
  name: i18n => i18n.get('components.jumbotronComponent.creator.name'),
  category: 'TextBus',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6ad1ec"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="100%" width="100%"/></g><path fill="#fff" opacity="0.3" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#fff" opacity="0.3"  d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path><text font-family="Helvetica, Arial, sans-serif" font-size="12" x="10" y="25" stroke-width="0.3" stroke="#000" fill="#000000">Hello, world!</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="40" stroke-width="0" stroke="#000" fill="#000000">我是 TextBus 富文本编辑器。</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="50" stroke-width="0" stroke="#000" fill="#000000">别来无恙？</text></svg>')}">`,
  factory(dialog: UIDialog, fileUploader: FileUploader, i18n) {
    const childI18n = i18n.getContext('components.jumbotronComponent.creator.form');

    const form = new Form({
      title: childI18n.get('title'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      cancelBtnText: childI18n.get('cancelBtnText'),
      items: [
        new FormTextField({
          name: 'minHeight',
          value: '200px',
          placeholder: childI18n.get('minHeightInputPlaceholder'),
          label: childI18n.get('minHeightLabel')
        }),
        new FormTextField({
          label: childI18n.get('backgroundImageLabel'),
          name: 'backgroundImage',
          placeholder: childI18n.get('backgroundImageInputPlaceholder'),
          canUpload: true,
          uploadType: 'image',
          uploadBtnText: childI18n.get('uploadBtnText'),
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('validateErrorMessage');
            }
            return null;
          }
        })]
    })

    form.setFileUploader(fileUploader);
    return new Promise<JumbotronComponent>((resolve) => {
      dialog.dialog(form.elementRef);
      const s = form.onComplete.subscribe(data => {
        const component = new JumbotronComponent({
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundImage: data.get('backgroundImage'),
          minHeight: data.get('minHeight') + ''
        });
        const h1 = new BlockComponent('h1');
        h1.slot.append('Hello, world!')
        const p1 = new BlockComponent('p')
        p1.slot.append('你好，我是 TextBus 富文本编辑器。');
        const p2 = new BlockComponent('p');
        p2.slot.append('你现在还好吗？');

        component.slot.append(h1);
        component.slot.append(p1);
        component.slot.append(p2);

        s.unsubscribe();
        resolve(component)
        dialog.close();
      });
      const b = form.onClose.subscribe(() => {
        s.unsubscribe();
        b.unsubscribe();
        dialog.close();
      })
    })
  }
}
