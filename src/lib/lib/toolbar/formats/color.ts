import { Subject } from 'rxjs';
import { Picker, createPicker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { DropdownHandlerView } from '../handlers/utils/dropdown';
import { DropdownConfig, HandlerType, propertyHandlerPriority } from '../help';
import { StyleCommander } from '../../commands/style-commander';
import { CacheData } from '../utils/cache-data';

const commander = new StyleCommander('color', false);

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
export const colorHandler: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-color'],
  tooltip: '文字颜色',
  priority: propertyHandlerPriority,
  onHide: hideEvent.asObservable(),
  viewer: new Palette(),
  match: {
    styles: {
      color: /.+/
    }
  },
  execCommand: commander
};
