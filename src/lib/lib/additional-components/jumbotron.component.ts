import { ComponentReader, DivisionComponent, VElement, ViewData } from '../core/_api';
import { ComponentExample, Workbench } from '../workbench/_api';
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

    const jumbotronForm = document.createElement('form');
    jumbotronForm.classList.add('tbus-jumbotron');
    jumbotronForm.innerHTML = `
<h3>巨幕设置</h3>
<div class="tbus-jumbotron-form-group">
  <label>巨幕最小高度</label>
  <div>
    <input type="text" placeholder="请输入巨幕最小高度" value="200px">
  </div>
</div>
<div class="tbus-jumbotron-form-group">
  <label>背景图片地址</label>
  <div>
    <input type="text" placeholder="请输入背景图片地址">
  </div>
</div>
<div class="tbus-jumbotron-btns">
  <button type="submit">确认</button>
  <button type="button">取消</button>
</div>
    `;
    const inputs = jumbotronForm.querySelectorAll('input');
    const btns = jumbotronForm.querySelectorAll('button');

    inputs[1].onchange = function () {
      btns[0].disabled = !inputs[1].value;
    }

    return new Promise<JumbotronComponent>((resolve, reject) => {
      workbench.dialog(jumbotronForm);
      jumbotronForm.onsubmit = function (ev) {
        if (inputs[1].value) {
          const component = new JumbotronComponent({
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
            backgroundImage: inputs[1].value,
            minHeight: inputs[0].value
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
        ev.preventDefault();
        return false;
      }
      btns[1].onclick = function () {
        workbench.closeDialog();
        reject();
      }
    })
  }
}

export const jumbotronStyleSheet = `
jumbotron {
  display: block;
  height: 200px;
  margin-bottom: 1em;
  background-color: #eee;
  padding: 20px;
}
`;
