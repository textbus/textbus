import { Subject } from 'rxjs';
import { Picker, createPicker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { DropdownHandlerView } from '../handlers/utils/dropdown';
import { DropdownConfig, HandlerType } from '../help';
import { StyleCommander } from '../../commands/style-commander';


const updateEvent = new Subject<string>();
const hideEvent = new Subject<void>();


class Palette implements DropdownHandlerView {
  elementRef = document.createElement('div');

  private picker: Picker;

  constructor() {
    this.picker = createPicker(this.elementRef);
    this.picker.onSelected = function (ev) {
      updateEvent.next(ev.hex);
      hideEvent.next();
    };
  }

  updateStateByElement(el: HTMLElement): void {
    const color = el.style.color;
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
  onHide: hideEvent.asObservable(),
  viewer: new Palette(),
  match: {
    styles: {
      color: /.+/
    }
  },
  execCommand: new StyleCommander('color', updateEvent.asObservable())
};
