import {
  BranchAbstractComponent, Component,
  ComponentLoader,
  FormatAbstractData,
  FormatEffect,
  Fragment,
  SlotMap, SlotRendererFn,
  VElement,
  ViewData
} from '../core/_api';
import { ComponentExample } from '../workbench/component-stage';
import { BlockComponent } from '../components/block.component';
import { colorFormatter, fontSizeFormatter, boldFormatter } from '../formatter/_api';

const timelineTypes = ['primary', 'info', 'success', 'warning', 'danger', 'dark', 'gray'];
const colors = ['#1296db', '#6ad1ec', '#15bd9a', '#ff9900', '#E74F5E', '#495060', '#bbbec4'];

export type TimelineType = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'dark' | 'gray';

export interface TimelineConfig {
  type: TimelineType;
  fragment: Fragment;
}

function createTimelineItem(): TimelineConfig {
  const fragment = new Fragment();

  const title = new BlockComponent('div');

  title.slot.append('时间主题 2020-02-02');
  title.slot.apply(fontSizeFormatter, {
    state: FormatEffect.Valid,
    startIndex: 0,
    endIndex: 5,
    abstractData: new FormatAbstractData({
      styles: {
        fontSize: '18px'
      },
    })
  })
  title.slot.apply(boldFormatter, {
    state: FormatEffect.Valid,
    startIndex: 0,
    endIndex: 5,
    abstractData: new FormatAbstractData({
      tag: 'strong'
    })
  })
  title.slot.apply(fontSizeFormatter, {
    state: FormatEffect.Valid,
    startIndex: 5,
    endIndex: 18,
    abstractData: new FormatAbstractData({
      styles: {
        fontSize: '15px'
      },
    })
  })
  title.slot.apply(colorFormatter, {
    state: FormatEffect.Valid,
    startIndex: 5,
    endIndex: 18,
    abstractData: new FormatAbstractData({
      styles: {
        color: '#777'
      }
    })
  })

  const desc = new BlockComponent('p');
  desc.slot.append('描述信息...');

  fragment.append(title);
  fragment.append(desc);
  return {
    fragment,
    type: 'primary'
  };
}

class TimelineComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-timeline';
  }

  read(element: HTMLElement): ViewData {
    const slots: SlotMap[] = [];

    const list: TimelineConfig[] = Array.from(element.children).map(child => {
      let type: TimelineType = null;
      for (const k of timelineTypes) {
        if (child.classList.contains('tb-timeline-item-' + k)) {
          type = k as TimelineType;
          break;
        }
      }
      const slot = new Fragment()
      slots.push({
        toSlot: slot,
        from: child.lastChild?.nodeType === Node.ELEMENT_NODE ?
          child.lastChild as HTMLElement : document.createElement('div')
      });
      return {
        type,
        fragment: slot
      }
    });
    const component = new TimelineComponent(list);
    return {
      slotsMap: slots,
      component
    };
  }
}
@Component({
  loader: new TimelineComponentLoader(),
  styles: [
    `
tb-timeline {
  display: block;
  padding-top: 1em;
  padding-left: 5px;
}
.tb-timeline-item {
  display: block;
  position: relative;
  padding-left: 1.5em;
  padding-bottom: 1em;
  opacity: .76;
}

.tb-timeline-item:first-of-type .tb-timeline-line{
  top: 1em;
}

.tb-timeline-item:last-of-type .tb-timeline-line{
  bottom: calc(100% - 1em);
}

.tb-timeline-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px solid #dddee1;
}

.tb-timeline-icon {
  box-sizing: border-box;
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  left: -4px;
  top: .5em;
  background-color: #fff;
  border: 1px solid #bbbec4;
}

` + colors.map((value, index) => {
      return `
  .tb-timeline-item-${timelineTypes[index]} {
    opacity: 1;
  }
  .tb-timeline-item-${timelineTypes[index]} >.tb-timeline-icon {
    border-color: ${value};
    background-color: ${value};
  }
  .tb-timeline-item-${timelineTypes[index]} >.tb-timeline-line {
    border-color: ${value};
  }
  `
    }).join('\n')
  ],
  editModeStyles: [
    `
.tb-timeline-icon:hover {
  transform: scale(1.2);
  cursor: pointer;
}
.tb-timeline-add {
  display: none;
  position: absolute;
  right: 0;
  top: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.tb-timeline-add:before {
  content: "+";
}
.tb-timeline-add:hover {
  transform: scale(1.2);
}

.tb-timeline-item:hover .tb-timeline-add {
  display: block;
}
`
  ]
})
export class TimelineComponent extends BranchAbstractComponent {
  private vEle: VElement;

  constructor(private list: TimelineConfig[]) {
    super('tb-timeline');
    list.forEach(i => {
      this.slots.push(i.fragment);
    });
  }

  clone(): TimelineComponent {
    return new TimelineComponent(this.list.map(i => {
      return {
        ...i,
        fragment: i.fragment.clone()
      }
    }));
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn): VElement {
    const list = new VElement('tb-timeline');
    this.vEle = list;
    this.list = this.list.filter(i => {
      return this.slots.includes(i.fragment);
    });

    this.list.forEach((item) => {
      const child = new VElement('div', {
        classes: ['tb-timeline-item']
      });

      const line = new VElement('div', {
        classes: ['tb-timeline-line']
      });
      const icon = new VElement('div', {
        classes: ['tb-timeline-icon']
      });

      if (item.type) {
        child.classes.push('tb-timeline-item-' + item.type);
      }

      const content = new VElement('div');

      child.appendChild(line);
      child.appendChild(icon);
      if (!isOutputMode) {
        icon.attrs.set('title', '点击切换颜色');

        icon.onRendered = nativeNode => {
          nativeNode.addEventListener('click', () => {
            const currentType = item.type;
            if (!currentType) {
              item.type = timelineTypes[0] as TimelineType;
            } else {
              item.type = timelineTypes[timelineTypes.indexOf(currentType) + 1] as TimelineType || null;
            }
            this.markAsDirtied();
          })
        }

        const btn = new VElement('span', {
          classes: ['tb-timeline-add']
        });
        child.appendChild(btn);

        btn.onRendered = nativeNode => {
          nativeNode.addEventListener('click', () => {
            const newSlot = {
              type: item.type,
              fragment: createTimelineItem().fragment
            };
            const index = this.slots.indexOf(item.fragment) + 1;
            this.list.splice(index, 0, newSlot);
            this.slots.splice(index, 0, newSlot.fragment);
          })
        }
      }

      child.appendChild(slotRendererFn(item.fragment, content));
      list.appendChild(child);
    })

    return list;
  }
}

export const timelineComponentExample: ComponentExample = {
  name: '时间轴',
  example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><circle r="2" cx="10" cy="12"></circle><line x1="10" y1="12" x2="10" y2="24" stroke-width="0.5"></line><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="16" y="14" stroke-width="0" stroke="#000" fill="#000000">事件主题</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="38" y="13.5" stroke-width="0" stroke="#000" fill="#888">2020-08-08</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="16" y="20" stroke-width="0" stroke="#000" fill="#000000">详细说明...</text></g></defs><use xlink:href="#item" fill="#1296db" stroke="#1296db"></use><use xlink:href="#item" transform="translate(0, 14)" fill="#15bd9a" stroke="#15bd9a"></use><use xlink:href="#item" transform="translate(0, 28)" fill="#495060" stroke="#495060"></use><use xlink:href="#item" transform="translate(0, 42)" fill="#E74F5E" stroke="#E74F5E"></use></svg>')}">`,
  componentFactory() {
    return new TimelineComponent([createTimelineItem()]);
  }
}

