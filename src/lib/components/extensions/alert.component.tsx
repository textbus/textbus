import { Injectable } from '@tanbo/di';
import {
  Component,
  ComponentControlPanelView,
  ComponentLoader,
  ComponentSetter,
  DivisionAbstractComponent, SingleSlotRenderFn, SlotRenderFn, VElement,
  ViewData
} from '../../core/_api';
import { ComponentCreator } from '../../ui/extensions/component-stage.plugin';
import { Form, FormSelect, FormSwitch } from '../../ui/uikit/_api';
import { I18n } from '../../i18n';

class AlertComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.tagName.toLowerCase() === 'div' && element.classList.contains('tb-alert');
  }

  read(element: HTMLElement): ViewData {
    const component = new AlertComponent();
    return {
      component,
      slotsMap: [{
        toSlot: component.slot,
        from: element
      }]
    };
  }
}

@Injectable()
export class AlertComponentSetter implements ComponentSetter<AlertComponent> {
  constructor(private i18n: I18n) {
  }
  create(instance: AlertComponent): ComponentControlPanelView {
    const childI18n = this.i18n.getContext('components.alertComponent.setter');
    const form = new Form({
      mini: true,
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormSelect({
          name: 'type',
          label: childI18n.get('typeLabel'),
          options: 'default,primary,info,success,warning,danger,dark,gray'.split(',').map(i => {
            return {
              label: i,
              value: i,
              selected: i === instance.type
            }
          })
        }),
        new FormSwitch({
          label: childI18n.get('fillLabel'),
          name: 'fill',
          checked: instance.fill
        })
      ]
    })

    form.onComplete.subscribe(map => {
      instance.fill = map.get('fill');
      instance.type = map.get('type');
      instance.slot.markAsDirtied();
    });
    return {
      title: childI18n.get('title'),
      view: form.elementRef
    }
  }
}


@Component({
  loader: new AlertComponentLoader(),
  providers: [{
    provide: ComponentSetter,
    useClass: AlertComponentSetter
  }],
  styles: [`
.tb-alert {
  padding: 10px 15px;
  border-radius: 6px;
  border: 1px solid #e9eaec;
  background-color: #f8f8f9;
  margin-top: 1em;
  margin-bottom: 1em
}

.tb-alert.tb-alert-primary {
  border-color: rgba(18, 150, 219, 0.3);
  background-color: rgba(18, 150, 219, 0.15)
}

.tb-alert.tb-alert-primary.tb-alert-fill {
  color: #fff;
  background-color: #1296db
}

.tb-alert.tb-alert-success {
  border-color: rgba(21, 189, 154, 0.3);
  background-color: rgba(21, 189, 154, 0.15)
}

.tb-alert.tb-alert-success.tb-alert-fill {
  color: #fff;
  background-color: #15bd9a
}

.tb-alert.tb-alert-info {
  border-color: rgba(106, 209, 236, 0.3);
  background-color: rgba(106, 209, 236, 0.15)
}

.tb-alert.tb-alert-info.tb-alert-fill {
  color: #fff;
  background-color: #6ad1ec
}

.tb-alert.tb-alert-warning {
  border-color: rgba(255, 153, 0, 0.3);
  background-color: rgba(255, 153, 0, 0.15)
}

.tb-alert.tb-alert-warning.tb-alert-fill {
  color: #fff;
  background-color: #f90
}

.tb-alert.tb-alert-danger {
  border-color: rgba(231, 79, 94, 0.3);
  background-color: rgba(231, 79, 94, 0.15)
}

.tb-alert.tb-alert-danger.tb-alert-fill {
  color: #fff;
  background-color: #E74F5E
}

.tb-alert.tb-alert-dark {
  border-color: rgba(73, 80, 96, 0.3);
  background-color: rgba(73, 80, 96, 0.15)
}

.tb-alert.tb-alert-dark.tb-alert-fill {
  color: #fff;
  background-color: #495060
}

.tb-alert.tb-alert-gray {
  border-color: rgba(187, 190, 196, 0.3);
  background-color: rgba(187, 190, 196, 0.15)
}

.tb-alert.tb-alert-gray.tb-alert-fill {
  color: #fff;
  background-color: #bbbec4
}

.tb-alert-fill code {
  background-color: rgba(255, 255, 255, 0.2);
  border: none
}`
  ]
})
export class AlertComponent extends DivisionAbstractComponent {
  fill = false;
  type = '';

  constructor() {
    super('div');
  }

  clone() {
    const component = new AlertComponent();
    component.slot.from(this.slot.clone());
    return component;
  }

  slotRender(isOutputMode: boolean, singleSlotRendererFn: SingleSlotRenderFn): VElement {
    const classes = ['tb-alert'];
    if (this.fill) {
      classes.push('tb-alert-fill');
    }
    if (this.type) {
      classes.push('tb-alert-' + this.type);
    }
    return singleSlotRendererFn(this.slot, <div class={classes.join(' ')}/>);
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn): VElement {
    return slotRendererFn(this.slot);
  }
}

export const alertComponentExample: ComponentCreator = {
  name: i18n => i18n.get('components.alertComponent.creator.name'),
  category: 'TextBus',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg"><g><rect fill="#fff" height="100%" width="100%"/></g><rect width="90%" height="20" fill="#eee" stroke="#dedede" rx="5" ry="5" x="5" y="25"></rect><text font-family="Helvetica, Arial, sans-serif" font-size="10" x="10" y="35" stroke-width="0" stroke="#000" fill="#000000">文本内容</text></svg>')}">`,
  factory() {
    return new AlertComponent()
  }
}
