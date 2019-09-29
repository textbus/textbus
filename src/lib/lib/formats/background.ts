import { Subject } from 'rxjs';
import { Picker, createPicker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';

import { DropdownHandlerOption, DropdownHandlerView, HandlerType } from '../toolbar/help';
import { StyleFormatter } from '../frame/fomatter/style-formatter';

const updateEvent = new Subject<string>();
const hideEvent = new Subject<void>();


class Palette implements DropdownHandlerView {
  host = document.createElement('div');

  private picker: Picker;

  constructor() {
    this.picker = createPicker(this.host);
    this.picker.onSelected = function (ev) {
      updateEvent.next(ev.hex);
      hideEvent.next();
    };
  }

  updateStateByElement(el: HTMLElement): void {
    const color = el.style.backgroundColor;
    if (/^#/.test(color)) {
      this.picker.hex = color;
    } else if (/^rgba?/.test(color)) {
      this.picker.hex = rgb2Hex((parseCss(color) as ColorRGB));
    } else if (/^hsl/.test(color)) {
      this.picker.hex = hsl2Hex((parseCss(color) as ColorHSL));
    }
  }
}

export const backgroundHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-background-color'],
  tooltip: '背景颜色',
  onHide: hideEvent.asObservable(),
  viewer: new Palette(),
  match: {
    styles: {
      backgroundColor: /.+/
    }
  },
  execCommand: new StyleFormatter('backgroundColor', updateEvent.asObservable())
};
