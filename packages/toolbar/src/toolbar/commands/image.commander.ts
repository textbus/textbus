import { ImageComponent } from '@textbus/components';

import { CommandContext, Commander } from '../commander';

export class ImageCommander implements Commander<Map<string, any>> {
  recordHistory = true;


  command(context: CommandContext, attrs: Map<string, any>): void {
    const size = attrs.get('size');
    const maxSize = attrs.get('maxSize');
    const fn = function (component: ImageComponent) {
      component.src = attrs.get('src') as string;

      component.width = size.width || '';
      component.height = size.height || '';
      component.maxWidth = maxSize.width || '';
      component.maxHeight = maxSize.height || '';
      component.float = attrs.get('float') as string;
      component.margin = attrs.get('margin') as string;
      component.markAsDirtied();
    }

    context.selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (context.overlap) {
          const component = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (component instanceof ImageComponent) {
            fn(component);
          }
        } else {
          range.commonAncestorFragment.insert(new ImageComponent(attrs.get('src') as string, {
            width: size.width || '',
            height: size.height || '',
            maxWidth: maxSize.width || '',
            maxHeight: maxSize.height || '',
            float: attrs.get('float') as string,
            margin: attrs.get('margin') as string
          }), range.startIndex);
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
