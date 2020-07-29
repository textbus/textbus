import {
  BackboneComponent,
  BranchComponent,
  Commander,
  DivisionComponent,
  Fragment,
  Renderer,
  TBSelection
} from '../../core/_api';

export interface FindAndReplaceRule {
  findValue: string;
  next: boolean;
  replaceValue: string;
  replace: boolean;
  replaceAll: boolean;
}

export class FindCommander implements Commander<FindAndReplaceRule> {
  recordHistory = false;

  command(selection: TBSelection, rule: FindAndReplaceRule, overlap: boolean, renderer: Renderer, rootFragment: Fragment) {
    this.recordHistory = rule.findValue && (rule.replace || rule.replaceAll);
    this.highlight(rootFragment, rule.findValue);
  }

  highlight(fragment: Fragment, search: string) {
    let index = 0;
    fragment.sliceContents(0).forEach(item => {
      if (typeof item === 'string') {
        const r = item.match(new RegExp(search, 'g'));
      } else if (item instanceof DivisionComponent) {
        this.highlight(item.slot, search);
      } else if (item instanceof BranchComponent) {
        item.slots.forEach(s => this.highlight(s, search));
      } else if (item instanceof BackboneComponent) {
        Array.from(item).forEach(s => this.highlight(s, search));
      }
      index += item.length;
    });
  }
}
