import { Commander, TBSelection } from '../../core/_api';
import { AttrState } from '../forms/help';
import { ImageTemplate } from '../../templates/image.template';

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

    const fn = function (template: ImageTemplate) {
      template.src = attrs.get('src') as string;
      template.width = attrs.get('width') as string;
      template.height = attrs.get('height') as string;
    }

    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const template = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (template instanceof ImageTemplate) {
            fn(template);
          }
        } else {
          range.commonAncestorFragment.insert(new ImageTemplate(attrs.get('src') as string), range.startIndex);
        }
      } else {
        range.getSelectedScope().forEach(scope => {
          scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(template => {
            if (template instanceof ImageTemplate) {
              fn(template);
            }
          })
        });
      }
    })
  }
}
