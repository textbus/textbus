import {
  BackboneComponent,
  BranchComponent,
  ChildSlotModel,
  Commander,
  DivisionComponent,
  FormatAbstractData,
  FormatEffect,
  FormatterPriority,
  Fragment,
  InlineFormatter,
  Renderer,
  ReplaceModel,
  TBSelection,
  VElement
} from '../../core/_api';

class FindFormatter extends InlineFormatter {
  constructor() {
    super({}, FormatterPriority.InlineStyle);
  }

  match() {
    return FormatEffect.Invalid;
  }

  read(node: HTMLElement): FormatAbstractData {
    return null;
  }

  render(isProduction: boolean,
         state: FormatEffect,
         abstractData: FormatAbstractData,
         existingElement?: VElement): ChildSlotModel | ReplaceModel | null {
    const flag = !!existingElement;
    if (!existingElement) {
      existingElement = new VElement('span');
    }

    existingElement.styles.set('backgroundColor', '#ff0');
    existingElement.styles.set('color', '#000');

    return flag ? new ChildSlotModel(existingElement) : new ReplaceModel(existingElement);
  }
}

export const findFormatter = new FindFormatter();

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
    fragment.apply(findFormatter, {
      state: FormatEffect.Invalid,
      abstractData: null,
      startIndex: 0,
      endIndex: fragment.contentLength
    });
    fragment.sliceContents(0).forEach(item => {
      if (typeof item === 'string' && search) {
        let position = 0;
        while (true) {
          const i = item.indexOf(search, position);
          if (i > -1) {
            fragment.apply(findFormatter, {
              state: FormatEffect.Valid,
              abstractData: null,
              startIndex: i,
              endIndex: i + search.length
            });
            position = i + search.length;
          } else {
            break;
          }
        }
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
