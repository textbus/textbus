import { FormatRange } from './fragment';

export class FormatTree {
  children: FormatTree[] = [];
  constructor(public formatRange: FormatRange) {
  }
}
