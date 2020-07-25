import { ComponentReader, LeafComponent, VElement, ViewData } from '../core/_api';
import { ComponentExample, Workbench, Form, TextField } from '../workbench/_api';

export interface ProgressConfig {
  type: 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'gray' | 'dark';
  progress: number;
  max: number;
  min: number;
}

export class ProgressComponentReader implements ComponentReader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-progress';
  }

  from(element: HTMLElement): ViewData {
    const component = new ProgressComponent({
      type: element.getAttribute('type') as any,
      progress: +element.getAttribute('progress') || 0,
      max: +element.getAttribute('max') || 100,
      min: +element.getAttribute('min') || 0
    });
    return {
      slotsMap: [],
      component
    };
  }
}

export class ProgressComponent extends LeafComponent {
  constructor(private config: ProgressConfig) {
    super('tb-progress');
  }

  clone(): ProgressComponent {
    return undefined;
  }

  render(isProduction: boolean): VElement {
    const config = this.config;
    const wrap = new VElement(this.tagName, {
      attrs: {...config}
    });

    const progress = new VElement('div', {
      styles: {
        width: Math.round((config.progress - config.min) / (config.max - config.min) * 100) + '%'
      }
    });

    wrap.appendChild(progress);
    return wrap;
  }
}

export const progressComponentExample: ComponentExample = {
  name: '进度条',
  example: '',
  componentFactory(workbench: Workbench) {
    const form = new Form({
      title: '进度条设置',
      items: [
        new TextField({
          label: '最大值',
          name: 'max',
          defaultValue: '100',
          placeholder: '请输入最大值'
        }),
        new TextField({
          label: '最小值',
          name: 'min',
          placeholder: '请输入最小值',
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
            }
            return null;
          }
        }),
        new TextField({
          label: '当前进度',
          name: 'progress',
          placeholder: '请输入当前进度',
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
            }
            return null;
          }
        }),
        new TextField({
          label: '进度条类型',
          name: 'type',
          placeholder: '请选择类型',
          validateFn(value: string): string | null {
            if (!value) {
              return '必填项不能为空';
            }
            return null;
          }
        })
      ]
    });

    return new Promise<ProgressComponent>((resolve, reject) => {
      workbench.dialog(form.elementRef);
      form.onSubmit = function () {
        const data = form.getData();
        const component = new ProgressComponent({
          type: data.get('type') as any,
          max: +data.get('max'),
          min: +data.get('min'),
          progress: +data.get('progress')
        });

        workbench.closeDialog();
        resolve(component);
      };
      form.onClose = function () {
        workbench.closeDialog();
        reject();
      }
    })
  }
};

export const progressComponentStyleSheet = `
tb-progress {
  margin: 0.5em 0;
  background-color: #eee;
  border-radius: 5px;
  height: 10px;
  display: block;
  overflow: hidden;
}
tb-progress > div {
  height: 100%;
  border-radius: inherit;
  background-color: #aaa;
}
`;
