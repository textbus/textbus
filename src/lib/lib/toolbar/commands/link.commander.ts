import { Commander } from '../../core/commander';
import { TBSelection } from '../../core/selection';
import { LinkFormatter } from '../../formatter/link.formatter';

export class LinkCommander implements Commander {
  recordHistory = true;

  constructor(private formatter: LinkFormatter) {
  }

  updateValue(value: any) {
  }

  command(selection: TBSelection, overlap: boolean): void {
  }
}
