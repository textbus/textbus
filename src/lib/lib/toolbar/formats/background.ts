import { Subject } from 'rxjs';
import { Picker, createPicker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { DropdownConfig, HandlerType, propertyHandlerPriority } from '../help';
import { StyleCommander } from '../../commands/style-commander';
import { DropdownHandlerView } from '../handlers/utils/dropdown';
import { CacheData } from '../utils/cache-data';

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

  update(d?: CacheData): void {
    const color = d ? (d.style.value + '') : '';
    if (/^#/.test(color)) {
      this.picker.hex = color;
    } else if (/^rgba?/.test(color)) {
      this.picker.hex = rgb2Hex((parseCss(color) as ColorRGB));
    } else if (/^hsl/.test(color)) {
      this.picker.hex = hsl2Hex((parseCss(color) as ColorHSL));
    }
  }
}

export const backgroundHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-background-color'],
  priority: propertyHandlerPriority,
  tooltip: '背景颜色',
  onHide: hideEvent.asObservable(),
  viewer: new Palette(),
  match: {
    styles: {
      backgroundColor: /.+/
    }
  },
  execCommand: commander
};
