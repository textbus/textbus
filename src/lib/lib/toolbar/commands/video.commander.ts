import { Commander, TBSelection } from '../../core/_api';
import { AttrState } from '../forms/help';
import { VideoComponent } from '../../components/video.component';

export class VideoCommander implements Commander<AttrState[]> {
  recordHistory = true;

  private attrs: AttrState[];

  updateValue(value: AttrState[]) {
    this.attrs = value;
  }

  command(selection: TBSelection, overlap: boolean): void {
    const attrs = new Map<string, string | number | boolean>();
    this.attrs.forEach(attr => {
      attrs.set(attr.name, attr.value);
    });

    const fn = function (template: VideoComponent) {
      template.src = attrs.get('src') as string;
      template.autoplay = attrs.get('autoplay') as boolean;
      template.controls = attrs.get('controls') as boolean;
      template.width = attrs.get('width') as string;
      template.height = attrs.get('height') as string;
    }

    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const template = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (template instanceof VideoComponent) {
            fn(template);
          }
        } else {
          range.commonAncestorFragment.insert(
            new VideoComponent(attrs.get('src') as string, !!attrs.get('autoplay'), !!attrs.get('controls')),
            range.startIndex);
        }
      } else {
        range.getSelectedScope().forEach(scope => {
          scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(template => {
            if (template instanceof VideoComponent) {
              fn(template);
            }
          })
        });
      }
    })
  }
}
