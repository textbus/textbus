import { AudioComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export class AudioCommander implements Commander<Map<string, string | number | boolean>> {
  recordHistory = true;

  command(context: CommandContext, attrs: Map<string, string | number | boolean>): void {
    context.selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (context.overlap) {
          const component = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (component instanceof AudioComponent) {
            component.src = attrs.get('src') as string;
            component.autoplay = attrs.get('autoplay') as boolean;
            component.controls = attrs.get('controls') as boolean;
          }
        } else {
          range.commonAncestorFragment.insert(
            new AudioComponent(attrs.get('src') as string, !!attrs.get('autoplay'), !!attrs.get('controls')),
            range.startIndex);
        }
      } else {
        range.getSelectedScope().forEach(scope => {
          scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(component => {
            if (component instanceof AudioComponent) {
              component.src = attrs.get('src') as string;
              component.autoplay = attrs.get('autoplay') as boolean;
              component.controls = attrs.get('controls') as boolean;
            }
          })
        });
      }
    })
  }
}
