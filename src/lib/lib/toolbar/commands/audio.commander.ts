import { Commander, TBSelection } from '../../core/_api';
import { AudioComponent } from '../../components/audio.component';

export class AudioCommander implements Commander<Map<string, string | number | boolean>> {
  recordHistory = true;

  command(selection: TBSelection, attrs: Map<string, string | number | boolean>, overlap: boolean): void {

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
