import { Commander, TBSelection } from '../../core/_api';
import { AttrState } from '../../uikit/forms/help';
import { VideoComponent } from '../../components/video.component';

export class VideoCommander implements Commander<AttrState[]> {
  recordHistory = true;

  command(selection: TBSelection, states: AttrState[], overlap: boolean): void {
    const attrs = new Map<string, string | number | boolean>();
    states.forEach(attr => {
      attrs.set(attr.name, attr.value);
    });

    const fn = function (component: VideoComponent) {
      component.src = attrs.get('src') as string;
      component.autoplay = attrs.get('autoplay') as boolean;
      component.controls = attrs.get('controls') as boolean;
      component.width = attrs.get('width') as string;
      component.height = attrs.get('height') as string;
    }

    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const component = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (component instanceof VideoComponent) {
            fn(component);
          }
        } else {
          range.commonAncestorFragment.insert(
            new VideoComponent(attrs.get('src') as string, !!attrs.get('autoplay'), !!attrs.get('controls')),
            range.startIndex);
        }
      } else {
        range.getSelectedScope().forEach(scope => {
          scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(component => {
            if (component instanceof VideoComponent) {
              fn(component);
            }
          })
        });
      }
    })
  }
}
