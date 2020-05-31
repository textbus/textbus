import { Commander, TBSelection } from '../../core/_api';
import { AttrState } from '../forms/help';
import { AudioTemplate } from '../../templates/audio.template';

export class AudioCommander implements Commander<AttrState[]> {
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

    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (overlap) {
          const template = range.commonAncestorFragment.getContentAtIndex(range.startIndex);
          if (template instanceof AudioTemplate) {
            template.src = attrs.get('src') as string;
            template.autoplay = attrs.get('autoplay') as boolean;
            template.controls = attrs.get('controls') as boolean;
          }
        } else {
          range.commonAncestorFragment.insert(
            new AudioTemplate(attrs.get('src') as string, !!attrs.get('autoplay'), !!attrs.get('controls')),
            range.startIndex);
        }
      } else {
        range.getSelectedScope().forEach(scope => {
          scope.fragment.sliceContents(scope.startIndex, scope.endIndex).forEach(template => {
            if (template instanceof AudioTemplate) {
              template.src = attrs.get('src') as string;
              template.autoplay = attrs.get('autoplay') as boolean;
              template.controls = attrs.get('controls') as boolean;
            }
          })
        });
      }
    })
  }
}
