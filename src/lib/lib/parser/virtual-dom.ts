import { StyleRange } from './fragment';

export class VirtualDom {
  children: VirtualDom[] = [];
  constructor(public styleRange: StyleRange) {
  }
}
