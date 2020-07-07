import { BackboneTemplate, EventType, Fragment, TemplateTranslator, VElement, ViewData } from '../core/_api';
import { SingleTagTemplate } from '../templates/single-tag.template';
import { TemplateExample } from '../template-stage/template-stage';

export interface TodoListConfig {
  active: boolean;
  disabled: boolean;
  slot: Fragment;
}

export class TodoListTemplateTranslator implements TemplateTranslator {
  match(element: HTMLElement): boolean {
    return element.nodeName.toLowerCase() === 'tbus-todo-list';
  }

  from(element: HTMLElement): ViewData {
    const listConfig = Array.from(element.children).map(child => {
      const stateElement = child.querySelector('span.tbus-todo-list-state');
      return {
        active: stateElement.classList.contains('.tbus-todo-list-active'),
        disabled: stateElement.classList.contains('.tbus-todo-list-disabled'),
        childSlot: child.querySelector('.tbus-todo-list-content') as HTMLElement,
        slot: new Fragment()
      }
    })
    const template = new TodoListTemplate(listConfig);
    return {
      template,
      childrenSlots: listConfig.map(i => {
        return {
          toSlot: i.slot,
          from: i.childSlot
        }
      })
    };
  }
}

export class TodoListTemplate extends BackboneTemplate {
  constructor(public listConfigs: TodoListConfig[]) {
    super('tbus-todo-list');
    this.childSlots = listConfigs.map(i => i.slot);
  }

  canSplit(): boolean {
    return true;
  }

  render(isProduction: boolean): VElement {
    const list = new VElement('tbus-todo-list');
    this.listConfigs = this.listConfigs.filter(i => {
      return this.childSlots.includes(i.slot);
    });

    this.viewMap.clear();
    this.childSlots = [];
    this.listConfigs.forEach((config, index) => {
      const slot = config.slot;

      const item = new VElement('div', {
        classes: ['tbus-todo-list-item']
      });
      const btn = new VElement('div', {
        classes: ['tbus-todo-list-btn']
      })
      const state = new VElement('span', {
        classes: ['tbus-todo-list-state']
      });
      if (config.active) {
        state.classes.push('tbus-todo-list-active');
      }
      if (config.disabled) {
        state.classes.push('tbus-todo-list-disabled');
      }
      btn.appendChild(state);
      item.appendChild(btn);
      const content = new VElement('div', {
        classes: ['tbus-todo-list-content']
      });
      item.appendChild(content);
      if (slot.contentLength === 0) {
        slot.append(new SingleTagTemplate('br'));
      }
      this.viewMap.set(slot, content);
      this.childSlots.push(slot);
      list.appendChild(item);
      !isProduction && content.events.subscribe(event => {
        if (event.type === EventType.onEnter) {
          const firstRange = event.selection.firstRange;
          const {contents, formatRanges} = slot.delete(firstRange.endIndex);
          const next = new Fragment();
          if (slot.contentLength === 0) {
            slot.append(new SingleTagTemplate('br'));
          }
          contents.forEach(item => {
            next.append(item);
          });
          formatRanges.forEach(item => {
            next.apply(item);
          });

          if (next.contentLength === 0) {
            next.append(new SingleTagTemplate('br'))
          }
          this.listConfigs.splice(index + 1, 0, {
            ...config,
            slot: next
          });
          this.childSlots.splice(index + 1, 0, next);
          firstRange.startFragment = firstRange.endFragment = next;
          firstRange.startIndex = firstRange.endIndex = 0;
          event.stopPropagation();
        }
      });
    })
    return list;
  }

  clone(): TodoListTemplate {
    const configs = this.listConfigs.map(i => {
      return {
        ...i,
        slot: i.slot.clone()
      }
    });
    return new TodoListTemplate(configs);
  }
}

export const todoListTemplateExample: TemplateExample = {
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#fff" stroke="#1296db" height="8" width="8" rx="2" x="15" y="12"/><text font-family="Helvetica, Arial, sans-serif" font-size="8" x="28" y="19"  stroke-width="0" stroke="#000" fill="#000000">待办事项...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 12)"></use><use xlink:href="#item" transform="translate(0, 24)"></use><use xlink:href="#item" transform="translate(0, 36)"></use></svg>')}">`,
  templateFactory() {
    const fragment = new Fragment();
    fragment.append(new SingleTagTemplate('br'));
    return new TodoListTemplate([{
      active: false,
      disabled: false,
      slot: fragment
    }]);
  }
}

export const todoListStyleSheet = `
tbus-todo-list {
  display: block;
  margin-top: 1em;
  margin-bottom: 1em;
}
.tbus-todo-list-item {
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  display: flex;
}
.tbus-todo-list-btn {
  margin-right: 0.6em;
}
.tbus-todo-list-state {
  display: inline-block;
  margin-top: 3px;
  width: 12px;
  height: 12px;
  border: 2px solid #1296db;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
}
.tbus-todo-list-content {
  flex: 1;
}
`;
