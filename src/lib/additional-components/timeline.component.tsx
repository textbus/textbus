import {
  BranchAbstractComponent, Component,
  ComponentLoader,
  FormatAbstractData,
  FormatEffect,
  Fragment, SingleSlotRenderFn,
  SlotMap, SlotRendererFn,
  VElement,
  ViewData
} from '../core/_api';
import { ComponentCreator } from '../workbench/component-stage';
import { BlockComponent } from '../components/block.component';
import { colorFormatter, fontSizeFormatter, boldFormatter } from '../formatter/_api';

const timelineTypes = ['primary', 'info', 'success', 'warning', 'danger', 'dark', 'gray'];
const colors = ['#1296db', '#6ad1ec', '#15bd9a', '#ff9900', '#E74F5E', '#495060', '#bbbec4'];

export type TimelineType = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'dark' | 'gray';

class TimelineFragment extends Fragment {
  constructor(public type: TimelineType) {
    super();
  }

  clone(): TimelineFragment {
    const f = new TimelineFragment(this.type);
    f.from(super.clone());
    return f;
  }
}

function createTimelineItem(): TimelineFragment {
  const fragment = new TimelineFragment('primary');

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
  return fragment;
}

class TimelineComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-timeline';
  }

  read(element: HTMLElement): ViewData {
    const slots: SlotMap[] = [];

    const list: TimelineFragment[] = Array.from(element.children).map(child => {
      let type: TimelineType = null;
      for (const k of timelineTypes) {
        if (child.classList.contains('tb-timeline-item-' + k)) {
          type = k as TimelineType;
          break;
        }
      }
      const slot = new TimelineFragment(type)
      slots.push({
        toSlot: slot,
        from: child.querySelector('div.tb-timeline-content') || document.createElement('div')
      });
      return slot;
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
  padding-bottom: 0.5em;
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
export class TimelineComponent extends BranchAbstractComponent<TimelineFragment> {
  private vEle: VElement;

  constructor(list: TimelineFragment[]) {
    super('tb-timeline');
    this.slots.push(...list);
  }

  clone(): TimelineComponent {
    return new TimelineComponent(this.slots.map(f => f.clone()));
  }

  slotRender(slot: TimelineFragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    const {host, container} = this.renderItem(slot, isOutputMode);
    slotRendererFn(slot, container);
    return host
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRendererFn): VElement {
    const list = new VElement('tb-timeline');
    this.vEle = list;

    list.appendChild(...this.slots.map(item => {
      const {host, container} = this.renderItem(item, isOutputMode);
      slotRendererFn(item, container, host);
      return host;
    }));

    return list;
  }

  private renderItem(slot: TimelineFragment, isOutput: boolean) {
    const classes = ['tb-timeline-item'];
    if (slot.type) {
      classes.push('tb-timeline-item-' + slot.type);
    }
    const content = <div className="tb-timeline-content"/>;

    const child = (
      <div class={classes.join(' ')}>
        <div class="tb-timeline-line"/>
        <div class="tb-timeline-icon" title={isOutput ? null : '点击切换颜色'} onClick={() => {
          const currentType = slot.type;
          if (!currentType) {
            slot.type = timelineTypes[0] as TimelineType;
          } else {
            slot.type = timelineTypes[timelineTypes.indexOf(currentType) + 1] as TimelineType || null;
          }
          slot.markAsDirtied();
        }}/>
        {
          !isOutput && <span class="tb-timeline-add" onClick={() => {
            const index = this.slots.indexOf(slot) + 1;
            this.slots.splice(index, 0, createTimelineItem());
          }}/>
        }
        {content}
      </div>
    );

    return {
      host: child,
      container: content
    };
  }
}

export const timelineComponentExample: ComponentCreator = {
  name: '时间轴',
  category: 'TextBus',
  example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><circle r="2" cx="10" cy="12"></circle><line x1="10" y1="12" x2="10" y2="24" stroke-width="0.5"></line><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="16" y="14" stroke-width="0" stroke="#000" fill="#000000">事件主题</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="38" y="13.5" stroke-width="0" stroke="#000" fill="#888">2020-08-08</text><text font-family="Helvetica, Arial, sans-serif" font-size="4.5" x="16" y="20" stroke-width="0" stroke="#000" fill="#000000">详细说明...</text></g></defs><use xlink:href="#item" fill="#1296db" stroke="#1296db"></use><use xlink:href="#item" transform="translate(0, 14)" fill="#15bd9a" stroke="#15bd9a"></use><use xlink:href="#item" transform="translate(0, 28)" fill="#495060" stroke="#495060"></use><use xlink:href="#item" transform="translate(0, 42)" fill="#E74F5E" stroke="#E74F5E"></use></svg>')}">`,
  factory() {
    return new TimelineComponent([createTimelineItem()]);
  }
}

