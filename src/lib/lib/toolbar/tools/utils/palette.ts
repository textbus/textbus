import { createPicker, Picker } from '@tanbo/color-picker';
import { ColorHSL, ColorRGB, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color';
import { Observable, Subject } from 'rxjs';

import { DropdownViewer } from '../../toolkit/utils/dropdown';

export class Palette implements DropdownViewer<string> {
  elementRef = document.createElement('div');
  onComplete: Observable<string>;

  private picker: Picker;
  private completeEvent = new Subject<string>();

  constructor() {
    this.onComplete = this.completeEvent.asObservable();
    this.picker = createPicker(this.elementRef);
    this.picker.onSelected = (ev) => {
      this.completeEvent.next(ev.hex);
    };
  }

  update(d?: string): void {
    const color = d || '#f00';
    if (/^#/.test(color)) {
      this.picker.hex = color;
    } else if (/^rgba?/.test(color)) {
      this.picker.hex = rgb2Hex((parseCss(color) as ColorRGB));
    } else if (/^hsl/.test(color)) {
      this.picker.hex = hsl2Hex((parseCss(color) as ColorHSL));
    }
  }
}
