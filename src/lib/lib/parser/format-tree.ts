import { FormatRange } from './fragment';

export class FormatTree {
  parent: FormatTree = null;
  children: FormatTree[] = [];
  constructor(public formatRange: FormatRange) {
  }
}
