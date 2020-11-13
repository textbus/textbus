import {
  BranchComponent,
  EventType,
  Fragment,
  ComponentReader,
  VElement,
  ViewData,
} from '../core/_api';
import { BlockComponent, breakingLine, BrComponent } from '../components/_api';
import { ComponentExample } from '../workbench/component-stage';
import { Subscription } from 'rxjs';

export interface TodoListConfig {
  active: boolean;
  disabled: boolean;
  slot: Fragment;
}

export class TodoListComponentReader implements ComponentReader {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tb-todo-list';
  }

  from(element: HTMLElement): ViewData {
    const listConfig = Array.from(element.children).map(child => {
      const stateElement = child.querySelector('span.tb-todo-list-state');
      return {
        active: stateElement.classList.contains('tb-todo-list-state-active'),
        disabled: stateElement.classList.contains('tb-todo-list-state-disabled'),
        childSlot: child.querySelector('.tb-todo-list-content') as HTMLElement,
        slot: new Fragment()
      }
    })
    const component = new TodoListComponent(listConfig);
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

export class TodoListComponent extends BranchComponent {
  private subs: Subscription[] = [];
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

  constructor(public listConfigs: TodoListConfig[]) {
    super('tb-todo-list');
    this.slots.push(...listConfigs.map(i => i.slot));
  }

  render(isOutputMode: boolean): VElement {
    const list = new VElement('tb-todo-list');

    if (this.listConfigs.length === this.slots.length) {
      this.slots.forEach((slot, index) => {
        this.listConfigs[index].slot = slot;
      })
    } else {
      this.listConfigs = this.listConfigs.filter(i => {
        return this.slots.includes(i.slot);
      });
    }

    this.viewMap.clear();
    this.slots.length = 0;
    this.listConfigs.forEach((config) => {
      const slot = config.slot;

      const item = new VElement('div', {
        classes: ['tb-todo-list-item']
      });
      const btn = new VElement('div', {
        classes: ['tb-todo-list-btn']
      })
      const state = new VElement('span', {
        classes: ['tb-todo-list-state']
      });
      if (config.active) {
        state.classes.push('tb-todo-list-state-active');
      }
      if (config.disabled) {
        state.classes.push('tb-todo-list-state-disabled');
      }
      btn.appendChild(state);
      item.appendChild(btn);
      const content = new VElement('div', {
        classes: ['tb-todo-list-content']
      });
      item.appendChild(content);
      if (slot.contentLength === 0) {
        slot.append(new BrComponent());
      }
      this.viewMap.set(slot, content);
      this.slots.push(slot);
      list.appendChild(item);
      if (!isOutputMode) {
        this.handleEnter();
        state.onRendered = element => {
          element.addEventListener('click', () => {
            const i = (this.getStateIndex(config.active, config.disabled) + 1) % 4;
            const newState = this.stateCollection[i];
            config.active = newState.active;
            config.disabled = newState.disabled;
            config.active ?
              element.classList.add('tb-todo-list-state-active') :
              element.classList.remove('tb-todo-list-state-active');
            config.disabled ?
              element.classList.add('tb-todo-list-state-disabled') :
              element.classList.remove('tb-todo-list-state-disabled');
          })
        }
      }
    })
    return list;
  }

  clone(): TodoListComponent {
    const configs = this.listConfigs.map(i => {
      return {
        ...i,
        slot: i.slot.clone()
      }
    });
    return new TodoListComponent(configs);
  }

  private handleEnter() {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = this.listConfigs.map((config, index) => {
      const slot = config.slot;
      return slot.events.subscribe(event => {
        if (event.type === EventType.onEnter) {
          event.stopPropagation();

          const firstRange = event.selection.firstRange;

          if (slot === this.getSlotAtIndex(this.slots.length - 1)) {
            const lastContent = slot.getContentAtIndex(slot.contentLength - 1);
            if (slot.contentLength === 0 ||
              slot.contentLength === 1 && lastContent instanceof BrComponent) {
              this.slots.pop();
              const parentFragment = this.parentFragment;
              const p = new BlockComponent('p');
              p.slot.append(new BrComponent());
              parentFragment.insertAfter(p, this);
              firstRange.setStart(p.slot, 0);
              firstRange.collapse();
              return;
            }
          }

          const next = breakingLine(slot, firstRange.startIndex);

          this.listConfigs.splice(index + 1, 0, {
            ...config,
            slot: next
          });
          this.slots.splice(index + 1, 0, next);
          firstRange.startFragment = firstRange.endFragment = next;
          firstRange.startIndex = firstRange.endIndex = 0;
        }
      })
    })

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

export const todoListComponentExample: ComponentExample = {
  name: '待办事项列表',
  example: `<img alt="默认图片" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#fff" stroke="#1296db" height="8" width="8" rx="2" x="15" y="12"/><text font-family="Helvetica, Arial, sans-serif" font-size="8" x="28" y="19"  stroke-width="0" stroke="#000" fill="#000000">待办事项...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 12)"></use><use xlink:href="#item" transform="translate(0, 24)"></use><use xlink:href="#item" transform="translate(0, 36)"></use></svg>')}">`,
  componentFactory() {
    const fragment = new Fragment();
    fragment.append('待办事项...');
    return new TodoListComponent([{
      active: false,
      disabled: false,
      slot: fragment
    }]);
  }
}

export const todoListStyleSheet = `
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
`;
