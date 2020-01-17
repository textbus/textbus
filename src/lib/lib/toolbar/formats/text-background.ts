import { Subject } from 'rxjs';
import { createPicker, Picker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { DropdownConfig, HandlerType, Priority } from '../help';
import { StyleCommander } from '../../commands/style-commander';
import { DropdownHandlerView } from '../handlers/utils/dropdown';
import { AbstractData } from '../../parser/abstract-data';
import { dtd } from '../../dtd';

const commander = new StyleCommander('backgroundColor', false);

const hideEvent = new Subject<void>();

class Palette implements DropdownHandlerView {
  elementRef = document.createElement('div');

  private picker: Picker;

  constructor() {
    this.picker = createPicker(this.elementRef);
    this.picker.onSelected = function (ev) {
      commander.updateValue(ev.hex);
      hideEvent.next();
    };
  }

  update(d?: AbstractData): void {
    const color = d ? (d.style.value + '') : '#f00';
    if (/^#/.test(color)) {
      this.picker.hex = color;
    } else if (/^rgba?/.test(color)) {
      this.picker.hex = rgb2Hex((parseCss(color) as ColorRGB));
    } else if (/^hsl/.test(color)) {
      this.picker.hex = hsl2Hex((parseCss(color) as ColorHSL));
    }
  }
}

export const textBackgroundHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-background-color'],
  priority: Priority.Property,
  tooltip: '文字背景颜色',
  onHide: hideEvent.asObservable(),
  viewer: new Palette(),
  editable: {
    styleName: 'backgroundColor'
  },
  match: {
    styles: {
      backgroundColor: /.+/
    },
    noInTags: ['pre'],
    filter(node: HTMLElement | AbstractData) {
      return dtd[node instanceof AbstractData ? node.tag : node.tagName.toLowerCase()]?.display === 'inline';
    }
  },
  execCommand: commander
};
