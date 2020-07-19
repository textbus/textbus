import { ComponentReader, DivisionComponent, VElement, ViewData } from '../core/_api';
import { ComponentExample, Form, TextField, Workbench } from '../workbench/_api';
import { BlockComponent } from '../components/_api';

export interface JumbotronOptions {
  minHeight: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
}

export class JumbotronComponentReader implements ComponentReader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'jumbotron';
  }

  from(element: HTMLElement): ViewData {
    const style = element.style;
    const component = new JumbotronComponent({
      backgroundImage: style.backgroundImage,
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

export class JumbotronComponent extends DivisionComponent {
  private vEle: VElement;

  constructor(private options: JumbotronOptions) {
    super('jumbotron');
  }

  getSlotView(): VElement {
    return this.vEle;
  }

  clone(): JumbotronComponent {
    const component = new JumbotronComponent({
      ...this.options
    });
    component.slot.from(this.slot.clone());
    return component;
  }

  render(isProduction: boolean): VElement {
    const vEle = new VElement(this.tagName);
    const styles = vEle.styles;
    styles.set('backgroundImage', this.options.backgroundImage);
    styles.set('backgroundSize', this.options.backgroundSize || 'cover');
    styles.set('backgroundPosition', this.options.backgroundPosition || 'center');
    styles.set('minHeight', this.options.minHeight);
    this.vEle = vEle;
    return vEle;
  }
}

export const jumbotronComponentExample: ComponentExample = {
  name: '巨幕',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6ad1ec"/><stop offset="100%" stop-color="#fff"/></linearGradient></defs><g><rect fill="url(#bg)" height="100%" width="100%"/></g><path fill="#fff" opacity="0.3" d="M81.25 28.125c0 5.178-4.197 9.375-9.375 9.375s-9.375-4.197-9.375-9.375 4.197-9.375 9.375-9.375 9.375 4.197 9.375 9.375z"></path><path fill="#fff" opacity="0.3"  d="M87.5 81.25h-75v-12.5l21.875-37.5 25 31.25h6.25l21.875-18.75z"></path><text font-family="Helvetica, Arial, sans-serif" font-size="12" x="10" y="25" stroke-width="0.3" stroke="#000" fill="#000000">Hello, world!</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="40" stroke-width="0" stroke="#000" fill="#000000">你好，我是 TBus 富文本编辑器。</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="50" stroke-width="0" stroke="#000" fill="#000000">你现在还好吗？</text></svg>')}">`,
  componentFactory(workbench: Workbench) {

    const form = new Form({
      title: '巨幕设置',
      items: [
        new TextField({
          label: '巨幕最小高度',
          name: 'minHeight',
          defaultValue: '200px',
          placeholder: '请输入巨幕最小高度'
        }),
        new TextField({
          label: '背景图片地址',
          name: 'backgroundImage',
          placeholder: '请输入背景图片地址',
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
            }
            return null;
          }
        })
      ]
    });

    return new Promise<JumbotronComponent>((resolve, reject) => {
      workbench.dialog(form.elementRef);
      form.onSubmit = function () {
        const data = form.getData();
        const component = new JumbotronComponent({
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundImage: `url(${data.get('backgroundImage')})`,
          minHeight: data.get('minHeight') + ''
        });
        const h1 = new BlockComponent('h1');
        h1.slot.append('Hello, world!')
        const p1 = new BlockComponent('p')
        p1.slot.append('你好，我是 TBus 富文本编辑器。');
        const p2 = new BlockComponent('p');
        p2.slot.append('你现在还好吗？');

        component.slot.append(h1);
        component.slot.append(p1);
        component.slot.append(p2);

        resolve(component);
        workbench.closeDialog();
      }
      form.onClose = function () {
        workbench.closeDialog();
        reject();
      }
    })
  }
}

export const jumbotronStyleSheet = `
jumbotron {
  display: block;
  min-height: 200px;
  margin-bottom: 1em;
  background-color: #eee;
  padding: 20px;
}
`;
