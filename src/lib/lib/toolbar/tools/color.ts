import { createPicker, Picker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { Subject } from 'rxjs';

import { DropdownConfig, HandlerType } from '../help';
import { colorFormatter } from '../../formatter/color';
import { DropdownHandlerView } from '../handlers/utils/dropdown';
import { StyleCommander } from '../../commands/style-commander';
import { AbstractData } from '../../core/abstract-data';
import { FormatMatcher } from '../../matcher/format-matcher';

const hideEvent = new Subject<void>();
const commander = new StyleCommander('color', colorFormatter);

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

export const color: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-color'],
  tooltip: '文字颜色',
  viewer: new Palette(),
  onHide: hideEvent.asObservable(),
  match: new FormatMatcher(colorFormatter),
  execCommand: commander
};
