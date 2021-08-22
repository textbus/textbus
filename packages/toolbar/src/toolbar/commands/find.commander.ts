import { Subscription } from 'rxjs';
import {
  Injector, RootComponent, Layout,
  BackboneAbstractComponent,
  BranchAbstractComponent,
  DivisionAbstractComponent,
  ElementPosition,
  FormatData,
  FormatEffect, FormatRendingContext,
  FormatterPriority, Fragment,
  InlineFormatter, Renderer, TBSelection,
  VElement
} from '@textbus/core';
import { PreComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export interface FindAndReplaceRule {
  findValue: string;
  next: boolean;
  replaceValue: string;
  replace: boolean;
  replaceAll: boolean;
}

class FindFormatter extends InlineFormatter {
  constructor() {
    super({}, FormatterPriority.InlineStyle);
  }

  match() {
    return FormatEffect.Invalid;
  }

  read(): FormatData {
    return null;
  }

  render(context: FormatRendingContext, existingElement?: VElement) {
    if (context.isOutputMode) {
      return null;
    }
    const flag = !!existingElement;
    if (!existingElement) {
      existingElement = new VElement('span');
    }

    existingElement.styles.set('backgroundColor', '#ff0');
    existingElement.styles.set('color', '#000');

    return flag ? null : existingElement;
  }
}

export const findFormatter = new FindFormatter();

export class FindCommander implements Commander<FindAndReplaceRule> {
  recordHistory = false;
  private findValue: string;
  private positions: ElementPosition[] = [];
  private positionIndex = 0;
  private scrollContainer: HTMLElement;

  private selection: TBSelection;
  private rootComponent: RootComponent;

  private rootFragment: Fragment;
  private subs: Subscription[] = [];

  setup(injector: Injector) {
    this.rootComponent = injector.get(RootComponent);
    this.rootFragment = this.rootComponent.slot;
    this.selection = injector.get(TBSelection);
    const renderer = injector.get(Renderer);
    this.scrollContainer = injector.get(Layout).scroller;
    this.subs.push(
      renderer.onRendingBefore.subscribe(() => this.onRenderingBefore()),
      renderer.onViewUpdated.subscribe(() => this.onViewUpdated())
    )
  }

  command(context: CommandContext, rule: FindAndReplaceRule) {
    if (rule.next) {
      this.recordHistory = false;
      this.positionIndex++;
    } else if (rule.replace) {
      this.recordHistory = true;
      const current = this.positions[this.positionIndex];
      if (current) {
        current.fragment.cut(current.startIndex, current.endIndex);
        current.fragment.insert(rule.replaceValue, current.startIndex);
      }
    } else if (rule.replaceAll) {
      this.recordHistory = true;
      this.positions.reverse().forEach(p => {
        p.fragment.cut(p.startIndex, p.endIndex);
        p.fragment.insert(rule.replaceValue, p.startIndex);
      });
    } else {
      this.recordHistory = false;
      this.positionIndex = 0;
      this.selection.removeAllRanges();
      this.findValue = rule.findValue;
    }
    this.positions = this.findValue ? this.find(this.rootComponent.slot, this.findValue) : [];
    this.positionIndex = this.positionIndex % this.positions.length || 0;
    this.apply(this.positions);
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private onRenderingBefore() {
    if (this.findValue) {
      const newPositions = this.find(this.rootComponent.slot, this.findValue);
      if (newPositions.length !== this.positions.length) {
        this.positions = newPositions;
        this.positions.forEach((p, i) => {
          if (p.fragment === this.selection.commonAncestorFragment) {
            this.positionIndex = i;
          }
        })
        this.apply(this.positions);
      }
    }
    return true;
  }

  private onViewUpdated() {
    if (this.positions.length) {
      const range = this.selection.createRange();
      const current = this.positions[this.positionIndex];
      range.setStart(current.fragment, current.startIndex);
      range.setEnd(current.fragment, current.endIndex);
      this.selection.removeAllRanges(true);
      this.selection.addRange(range);
      this.selection.restore();
      const position = range.getRangePosition();
      this.scrollContainer.scrollTop = position.top;
    }
  }

  private apply(positions: ElementPosition[]) {
    this.rootFragment.apply(findFormatter, {
      effect: FormatEffect.Invalid,
      formatData: null,
      startIndex: 0,
      endIndex: this.rootFragment.length
    })
    positions.forEach(item => {
      item.fragment.apply(findFormatter, {
        effect: FormatEffect.Valid,
        formatData: null,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      })
    })
  }

  private find(fragment: Fragment, search: string): ElementPosition[] {
    const result: ElementPosition[] = [];
    fragment.sliceContents(0).forEach(item => {
      if (item instanceof PreComponent) {
        return;
      }
      if (typeof item === 'string' && search) {
        let position = 0;
        while (true) {
          const i = item.indexOf(search, position);
          if (i > -1) {
            result.push({
              fragment,
              startIndex: i,
              endIndex: i + search.length
            })
            position = i + search.length;
          } else {
            break;
          }
        }
      } else if (item instanceof DivisionAbstractComponent) {
        result.push(...this.find(item.slot, search));
      } else if (item instanceof BranchAbstractComponent) {
        item.slots.forEach(s => result.push(...this.find(s, search)));
      } else if (item instanceof BackboneAbstractComponent) {
        Array.from(item).forEach(s => result.push(...this.find(s, search)));
      }
    });
    return result;
  }
}
