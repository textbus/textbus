import { Commander, TBSelection } from '../../core/_api';
import { AttrState } from '../forms/help';
import { ImageComponent } from '../../components/image.component';

export class ImageCommander implements Commander<AttrState[]> {
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

    const fn = function (component: ImageComponent) {
      component.src = attrs.get('src') as string;
      component.width = attrs.get('width') as string;
      component.height = attrs.get('height') as string;
    }

    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const component = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (component instanceof ImageComponent) {
            fn(component);
          }
        } else {
          range.commonAncestorFragment.insert(new ImageComponent(attrs.get('src') as string), range.startIndex);
        }
      } else {
        range.getSelectedScope().forEach(scope => {
          scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(component => {
            if (component instanceof ImageComponent) {
              fn(component);
            }
          })
        });
      }
    })
  }
}
