import { Commander, TBSelection } from '../../core/_api';
import { AttrState } from '../../uikit/forms/help';
import { AudioComponent } from '../../components/audio.component';

export class AudioCommander implements Commander<AttrState[]> {
  recordHistory = true;

  command(selection: TBSelection, config: AttrState[], overlap: boolean): void {
    const attrs = new Map<string, string | number | boolean>();
    config.forEach(attr => {
      attrs.set(attr.name, attr.value);
    });

    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
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
