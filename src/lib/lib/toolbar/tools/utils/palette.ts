import { createPicker, Picker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { Subject } from 'rxjs';

import { DropdownHandlerView } from '../../handlers/utils/dropdown';
import { FormatAbstractData } from '../../../core/format-abstract-data';
import { Commander } from '../../../core/commander';

export class Palette implements DropdownHandlerView {
  elementRef = document.createElement('div');

  private picker: Picker;

  constructor(commander: Commander, hideEvent: Subject<any>) {
    this.picker = createPicker(this.elementRef);
    this.picker.onSelected = function (ev) {
      commander.updateValue(ev.hex);
      hideEvent.next();
    };
  }

  update(d?: FormatAbstractData): void {
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
