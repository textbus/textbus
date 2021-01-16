import { Injector, Type } from '@tanbo/di';

import {
  Component,
  ComponentLoader, ComponentSetter, ComponentPresetPanelView,
  DivisionAbstractComponent,
  SlotRendererFn,
  VElement,
  ViewData
} from '../core/_api';
import { ComponentExample, Dialog } from '../workbench/_api';
import { BlockComponent } from '../components/_api';
import { FileUploader, Form, FormTextField } from '../uikit/_api';

export interface JumbotronOptions {
  minHeight: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

class JumbotronComponentSetter implements ComponentSetter<JumbotronComponent> {
  private uploader: FileUploader;

  setup(injector: Injector) {
    this.uploader = injector.get(FileUploader as Type<FileUploader>);
  }

  create(instance: JumbotronComponent): ComponentPresetPanelView {
    const form = new Form({
      mini: true,
      items: [
        new FormTextField({
          name: 'minHeight',
          value: instance.options.minHeight,
          placeholder: '请输入巨幕最小高度',
          label: '巨幕最小高度'
        }),
        new FormTextField({
          label: '背景图片地址',
          name: 'backgroundImage',
          placeholder: '请输入背景图片地址',
          canUpload: true,
          uploadType: 'image',
          uploadBtnText: '上传新图片',
          value: instance.options.backgroundImage,
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
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
      instance.markAsDirtied();
    });
    return {
      title: '巨幕设置',
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
  setter: new JumbotronComponentSetter(),
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

  slotRender(isOutputMode: boolean, slotRendererFn: SlotRendererFn): VElement {
    return this.render(isOutputMode, slotRendererFn);
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn): VElement {
    const vEle = new VElement(this.tagName, {
      styles: {
        backgroundImage: `url("${this.options.backgroundImage}")`,
        backgroundSize: this.options.backgroundSize || 'cover',
        backgroundPosition: this.options.backgroundPosition || 'center',
        minHeight: this.options.minHeight
      }
    });
    return slotRendererFn(this.slot, vEle, vEle);
  }
}

export const jumbotronComponentExample: ComponentExample = {
  name: '巨幕',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6ad1ec"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="100%" width="100%"/></g><path fill="#fff" opacity="0.3" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#fff" opacity="0.3"  d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path><text font-family="Helvetica, Arial, sans-serif" font-size="12" x="10" y="25" stroke-width="0.3" stroke="#000" fill="#000000">Hello, world!</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="40" stroke-width="0" stroke="#000" fill="#000000">我是 TextBus 富文本编辑器。</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="50" stroke-width="0" stroke="#000" fill="#000000">别来无恙？</text></svg>')}">`,
  componentFactory(dialog: Dialog, fileUploader: FileUploader) {

    const form = new Form({
      title: '巨幕设置',
      items: [
        new FormTextField({
          name: 'minHeight',
          value: '200px',
          placeholder: '请输入巨幕最小高度',
          label: '巨幕最小高度'
        }),
        new FormTextField({
          label: '背景图片地址',
          name: 'backgroundImage',
          placeholder: '请输入背景图片地址',
          canUpload: true,
          uploadType: 'image',
          uploadBtnText: '上传新图片',
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
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
