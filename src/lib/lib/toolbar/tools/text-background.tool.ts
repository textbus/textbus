import { createPicker, Picker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { Subject } from 'rxjs';

import { DropdownConfig, HandlerType } from '../help';
import { backgroundColor } from '../../formatter/style.formatter';
import { DropdownHandlerView } from '../handlers/utils/dropdown';
import { StyleCommander } from '../commands/style.commander';
import { AbstractData } from '../../core/abstract-data';
import { FormatMatcher } from '../matcher/format.matcher';

const hideEvent = new Subject<void>();
const commander = new StyleCommander('backgroundColor', backgroundColor);

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

export const textBackgroundTool: DropdownConfig = {
  type: HandlerType.Dropdown,
  classes: ['tbus-icon-background-color'],
  tooltip: '文字背景颜色',
  viewer: new Palette(),
  onHide: hideEvent.asObservable(),
  match: new FormatMatcher(backgroundColor),
  execCommand: commander
};
