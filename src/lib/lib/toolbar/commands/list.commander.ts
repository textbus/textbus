import { Commander, TBSelection, Renderer } from '../../core/_api';

export class ListCommander implements Commander {
  recordHistory = true;

  constructor(private tagName: 'ol' | 'ul') {
  }

  command(selection: TBSelection, overlap: boolean, renderer: Renderer): void {
    selection.ranges.forEach(range => {
      range.getBlockFragmentsBySelectedScope().forEach(scope => {
        console.log(scope)
      })
    })
  }
}
