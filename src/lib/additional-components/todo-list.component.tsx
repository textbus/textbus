import { Injectable } from '@tanbo/di';

import {
  BranchAbstractComponent,
  Fragment,
  ComponentLoader,
  VElement,
  BrComponent,
  ViewData, SlotRenderFn, Component, Interceptor, TBEvent, TBSelection, SingleSlotRenderFn,
} from '../core/_api';
import { BlockComponent, breakingLine } from '../components/_api';
import { ComponentCreator } from '../workbench/component-stage';

class TodoListFragment extends Fragment {
  constructor(public active: boolean, public disabled: boolean) {
    super();
  }
}

class TodoListComponentLoader implements ComponentLoader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-todo-list';
  }

  read(element: HTMLElement): ViewData {
    const listConfig = Array.from(element.children).map(child => {
      const stateElement = child.querySelector('span.tb-todo-list-state');
      return {
        childSlot: child.querySelector('.tb-todo-list-content') as HTMLElement,
        slot: new TodoListFragment(
          stateElement?.classList.contains('tb-todo-list-state-active'),
          stateElement?.classList.contains('tb-todo-list-state-disabled'))
      }
    })
    const component = new TodoListComponent(listConfig.map(i => i.slot));
    return {
      component: component,
      slotsMap: listConfig.map(i => {
        return {
          toSlot: i.slot,
          from: i.childSlot
        }
      })
    };
  }
}

@Injectable()
class TodoListComponentInterceptor implements Interceptor<TodoListComponent> {
  constructor(private selection: TBSelection) {
  }

  onEnter(event: TBEvent<TodoListComponent>) {
    const component = event.instance;
    event.stopPropagation();

    const firstRange = this.selection.firstRange;
    const slot = this.selection.commonAncestorFragment as TodoListFragment;

    const index = component.slots.indexOf(slot);

    if (slot === component.slots[component.slots.length - 1]) {
      const lastContent = slot.getContentAtIndex(slot.length - 1);
      if (slot.length === 0 ||
        slot.length === 1 && lastContent instanceof BrComponent) {
        component.slots.pop();
        const parentFragment = component.parentFragment;
        const p = new BlockComponent('p');
        p.slot.append(new BrComponent());
        parentFragment.insertAfter(p, component);
        firstRange.setStart(p.slot, 0);
        firstRange.collapse();
        return;
      }
    }
    const next = new TodoListFragment(slot.active, slot.disabled);
    next.from(breakingLine(slot, firstRange.startIndex));

    component.slots.splice(index + 1, 0, next);
    firstRange.setPosition(next, 0);
  }
}

@Component({
  loader: new TodoListComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: TodoListComponentInterceptor
  }],
  styles: [
    `
tb-todo-list {
  display: block;
  margin-top: 1em;
  margin-bottom: 1em;
}
.tb-todo-list-item {
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  display: flex;
}
.tb-todo-list-btn {
  margin-right: 0.6em;
}
.tb-todo-list-state {
  display: inline-block;
  margin-top: 3px;
  width: 12px;
  height: 12px;
  border: 2px solid #1296db;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
}
.tb-todo-list-state:after {
  content: "";
  position: absolute;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  left: 3px;
  top: 1px;
  width: 4px;
  height: 6px;
  transform: rotateZ(45deg);
}
.tb-todo-list-state-active:after {
  border-color: #1296db;
}
.tb-todo-list-state-disabled {
  opacity: 0.5;
}
.tb-todo-list-content {
  flex: 1;
}
`
  ]
})
export class TodoListComponent extends BranchAbstractComponent<TodoListFragment> {
  private stateCollection = [{
    active: false,
    disabled: false
  }, {
    active: true,
    disabled: false
  }, {
    active: false,
    disabled: true
  }, {
    active: true,
    disabled: true
  }]

  constructor(public listConfigs: TodoListFragment[]) {
    super('tb-todo-list');
    this.slots.push(...listConfigs);
  }

  slotRender(slot: TodoListFragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    const {host, container} = this.renderItem(slot);
    slotRendererFn(slot, container);
    return host
  }

  render(isOutputMode: boolean, slotRendererFn: SlotRenderFn): VElement {
    return new VElement('tb-todo-list', {
      childNodes: this.slots.map(slot => {
        const {host, container} = this.renderItem(slot);
        slotRendererFn(slot, container, host);
        return host;
      })
    });
  }

  clone(): TodoListComponent {
    const configs = this.slots.map(i => {
      return i.clone()
    });
    return new TodoListComponent(configs as TodoListFragment[]);
  }

  private renderItem(slot: TodoListFragment) {
    const state = ['tb-todo-list-state'];

    if (slot.active) {
      state.push('tb-todo-list-state-active');
    }
    if (slot.disabled) {
      state.push('tb-todo-list-state-disabled');
    }
    const content = <div class="tb-todo-list-content"/>
    const item = (
      <div class="tb-todo-list-item">
        <div class="tb-todo-list-btn">
          <div class={state.join(' ')} onClick={() => {
            const i = (this.getStateIndex(slot.active, slot.disabled) + 1) % 4;
            const newState = this.stateCollection[i];
            slot.active = newState.active;
            slot.disabled = newState.disabled;
            slot.markAsDirtied();
          }}/>
        </div>
        {content}
      </div>
    );
    return {
      host: item,
      container: content
    };
  }

  private getStateIndex(active: boolean, disabled: boolean) {
    for (let i = 0; i < 4; i++) {
      const item = this.stateCollection[i];
      if (item.active === active && item.disabled === disabled) {
        return i;
      }
    }
    return -1;
  }
}

export const todoListComponentExample: ComponentCreator = {
  name: '待办事项列表',
  category: 'TextBus',
  example: `<img alt="默认图片" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#fff" stroke="#1296db" height="8" width="8" rx="2" x="15" y="12"/><text font-family="Helvetica, Arial, sans-serif" font-size="8" x="28" y="19"  stroke-width="0" stroke="#000" fill="#000000">待办事项...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 12)"></use><use xlink:href="#item" transform="translate(0, 24)"></use><use xlink:href="#item" transform="translate(0, 36)"></use></svg>')}">`,
  factory() {
    const fragment = new TodoListFragment(false, false);
    fragment.append('待办事项...');
    return new TodoListComponent([fragment]);
  }
}
