import {
  BackboneComponent,
  BranchComponent,
  Commander,
  DivisionComponent, ElementPosition,
  Fragment,
  Lifecycle, Renderer,
  TBSelection
} from '../core/_api';
import { Editor } from '../editor';
import { FindCommander } from '../toolbar/commands/find.commander';
import { FindAndReplaceRule } from '../toolbar/tools/find.tool';
import { PreComponent } from '../components/pre.component';

export class FindHook implements Lifecycle {
  private findValue: string;
  private commander: FindCommander;
  private positions: ElementPosition[] = [];
  private positionIndex = 0;
  private isJustFind = true;

  onApplyCommand(commander: Commander, selection: TBSelection, editor: Editor, rootFragment: Fragment, params: any, updateParamsFn: (newParams: any) => void): boolean {
    this.isJustFind = false;
    if (commander instanceof FindCommander) {
      const rule = params as FindAndReplaceRule;
      if (rule.next) {
        commander.recordHistory = false;
        this.positionIndex++;
      } else if (rule.replace) {
        commander.recordHistory = true;
        const current = this.positions[this.positionIndex];
        if (current) {
          current.fragment.cut(current.startIndex, current.endIndex - current.startIndex);
          current.fragment.insert(rule.replaceValue, current.startIndex);
        }
      } else if (rule.replaceAll) {
        commander.recordHistory = true;
        this.positions.reverse().forEach(p => {
          p.fragment.cut(p.startIndex, p.endIndex - p.startIndex);
          p.fragment.insert(rule.replaceValue, p.startIndex);
        });
      } else {
        this.isJustFind = true;
        commander.recordHistory = false;
        this.positionIndex = 0;
        selection.removeAllRanges();
        this.commander = commander;
        this.findValue = params.findValue;
      }
      const newParams = this.findValue ? this.find(rootFragment, this.findValue) : [];
      this.positions = newParams;
      this.positionIndex = this.positionIndex % this.positions.length || 0;
      updateParamsFn(newParams);
    }
    return true;
  }

  onRenderingBefore(renderer: Renderer, selection: TBSelection, editor: Editor, rootFragment: Fragment): boolean {
    if (this.findValue && this.commander && !this.isJustFind) {
      this.positions = this.find(rootFragment, this.findValue);
      this.commander.command(selection, this.positions, false, renderer, rootFragment);
    }
    return true;
  }

  onViewUpdated(renderer: Renderer, selection: TBSelection, editor: Editor, rootFragment: Fragment) {
    if (this.positions.length && !this.isJustFind) {
      selection.removeAllRanges(true);
      const r = selection.createRange();
      const current = this.positions[this.positionIndex];
      r.setStart(current.fragment, current.startIndex);
      r.setEnd(current.fragment, current.endIndex);
      selection.addRange(r, true);
      selection.restore();
    }
  }

  private find(fragment: Fragment, search: string): ElementPosition[] {
    const result: ElementPosition[] = [];
    let index = 0;
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
      } else if (item instanceof DivisionComponent) {
        result.push(...this.find(item.slot, search));
      } else if (item instanceof BranchComponent) {
        item.slots.forEach(s => result.push(...this.find(s, search)));
      } else if (item instanceof BackboneComponent) {
        Array.from(item).forEach(s => result.push(...this.find(s, search)));
      }
      index += item.length;
    });
    return result;
  }
}
