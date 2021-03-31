import {
  BranchAbstractComponent, Component,
  ComponentLoader,
  FormatData,
  FormatEffect,
  Fragment, SingleSlotRenderFn, SlotRenderFn,
  VElement,
  ViewData,
} from '../../core/_api';
import { ComponentCreator } from '../../ui/extensions/component-stage.plugin';
import { BlockComponent } from '../block.component';
import { boldFormatter, fontSizeFormatter } from '../../formatter/_api';

function createItem(): Fragment {
  const fragment = new Fragment();
  const title = new BlockComponent('div');
  title.slot.append('标题');
  title.slot.apply(fontSizeFormatter, {
    effect: FormatEffect.Valid,
    formatData: new FormatData({
      styles: {
        fontSize: '18px'
      }
    }),
    startIndex: 0,
    endIndex: 2
  });
  title.slot.apply(boldFormatter, {
    effect: FormatEffect.Valid,
    formatData: new FormatData({
      tag: 'strong'
    }),
    startIndex: 0,
    endIndex: 2
  });
  const content = new BlockComponent('p');
  content.slot.append('描述信息...');
  fragment.append(title);
  fragment.append(content);
  return fragment;
}

class StepComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-step';
  }

  read(element: HTMLElement): ViewData {
    const listConfig = Array.from(element.children).map(child => {
      return {
        from: child.querySelector('.tb-step-item-content') as HTMLElement,
        toSlot: new Fragment()
      }
    })
    const component = new StepComponent(listConfig.map(i => i.toSlot), +element.getAttribute('step') || 0);
    return {
      component: component,
      slotsMap: listConfig
    };
  }
}

@Component({
  loader: new StepComponentLoader(),
  styles: [
    `
tb-step {
  display: flex;
}
.tb-step-item {
  position: relative;
  flex: 1;
}

.tb-step-item:last-child .tb-step-item-line {
  display: none;
}

.tb-step-item.tb-complete .tb-step-item-line {
  border-top-color: #15bd9a;
}
.tb-step-item.tb-complete .tb-step-item-icon {
  background-color: #15bd9a;
}

.tb-step-item.tb-current .tb-step-item-line {
  border-top-style: dashed;
}
.tb-step-item.tb-current .tb-step-item-icon {
  background-color: #1296db;
}

.tb-step-item.tb-waiting .tb-step-item-line {
  border-top-style: dashed;
}

.tb-step-item.tb-waiting .tb-step-item-icon {
  background-color: #bbbec4;
}
.tb-step-item.tb-waiting .tb-step-item-content {
  opacity: .8;
}

.tb-step-item-header {
  position: relative;
  margin-bottom: 1em;
}

.tb-step-item-icon {
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
  position: relative;
  text-align: center;
  line-height: 1.6em;
  color: #fff;
  font-weight: 500;
}

.tb-step-item-line {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 1px solid #dddee1;
}

.tb-step-item-content {
  padding-right: 15px;
}

.tb-step-title {
  font-weight: 500;
  margin: 0;
  font-size: 1.2em;
}

.tb-step-title > small {
  font-weight: normal;
  opacity: .8;
}

.tb-step-content {
  font-weight: normal;
  margin: 0;
}
`
  ],
  editModeStyles: [
    `
.tb-step-item-add {
  position: absolute;
  right:0;
  top: 0;
  display: none;
  cursor: pointer;
}

.tb-step-item-add:hover {
  transform: scale(1.2);
}

.tb-step-item-add:after {
  content: "+"
}
.tb-step-item:hover .tb-step-item-add {
  display: block;
}

.tb-step-item-icon {
  cursor: pointer;
}
`
  ]
})
export class StepComponent extends BranchAbstractComponent {
  constructor(slots: Fragment[], private step: number) {
    super('tb-steps');

    this.slots.push(...slots);
  }

  clone(): StepComponent {
    return new StepComponent(this.slots.map(i => i.clone()), this.step);
  }

  slotRender(slot: Fragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    const {host, container} = this.renderItem(slot, isOutputMode);
    slotRendererFn(slot, container);
    return host
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn): VElement {
    return new VElement('tb-step', {
      attrs: {
        step: this.step
      },
      childNodes: this.slots.map(slot => {
        return slotRendererFn(slot)
      })
    });
  }

  private renderItem(slot: Fragment, isOutputMode: boolean) {
    const index = this.slots.indexOf(slot);
    let state = 'tb-waiting';
    if (index < this.step) {
      state = 'tb-complete';
    } else if (index === this.step) {
      state = 'tb-current'
    }
    const content = <div class="tb-step-item-content"/>;

    const item = (
      <div class={'tb-step-item ' + state}>
        <div class="tb-step-item-header">
          <div class="tb-step-item-line"/>
          <div class="tb-step-item-icon" onClick={() => {
            const currentStep = this.step;
            if (index === currentStep) {
              this.step = index + 1;
            } else if (index + 1 === currentStep) {
              this.step = index - 1;
            } else {
              this.step = index;
            }
            this.slots.forEach(i => i.markAsDirtied());
            this.markAsDirtied();
          }}>{index + 1}</div>
        </div>
        {content}
        {
          !isOutputMode && <span class="tb-step-item-add" onClick={
            () => {
              this.slots.splice(index + 1, 0, createItem());
            }
          }/>
        }
      </div>
    )
    return {
      host: item,
      container: content
    };
  }
}

export const stepsComponentExample: ComponentCreator = {
  name: i18n => i18n.get('components.stepsComponent.creator.name'),
  category: 'TextBus',
  example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><circle r="2" cx="10" cy="12"></circle><line x1="12" y1="12" x2="38" y2="12" stroke-width="0.5"></line><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="8" y="22" stroke-width="0" stroke="#000" fill="#000000">标题</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="8" y="27" stroke-width="0" stroke="#000" fill="#000">描述信息...</text></g></defs><use xlink:href="#item" transform="translate(0, 20)" fill="#15bd9a" stroke="#15bd9a"></use><use xlink:href="#item" transform="translate(30, 20)" fill="#1296db" stroke="#1296db"></use><use xlink:href="#item" transform="translate(60, 20)" fill="#aaa" stroke="#aaa"></use></svg>')}">`,
  factory() {
    return new StepComponent([createItem()], 0);
  }
};
