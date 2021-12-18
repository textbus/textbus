import { createPicker, Picker } from '@tanbo/color-picker'
import { ColorHSL, ColorRGB, ColorRGBA, hsl2Hex, parseCss, rgb2Hex } from '@tanbo/color'
import { Observable, Subject } from '@tanbo/stream'

export class Palette {
  static defaultColors: string[] = ['#f8f8f9', '#e9eaec', '#dddee1', '#bbbec4', '#80848f', '#495060', '#1c2838', '#e74f5e', '#ff9900', '#15bd9a', '#6ad1ec', '#1296db']
  elementRef = document.createElement('div')
  onComplete: Observable<string | null>

  private picker: Picker
  private completeEvent = new Subject<string | null>()

  constructor(private styleName: string, btnText: string, colors?: string[]) {
    this.elementRef.classList.add('textbus-toolbar-palette')
    this.onComplete = this.completeEvent.asObservable()
    this.picker = createPicker(this.elementRef, {
      btnText,
      colors: colors || (Palette.defaultColors?.length ? Palette.defaultColors : [])
    })
    this.picker.onSelected = (ev) => {
      if (!ev.rgba) {
        this.completeEvent.next(null)
      } else if (ev.rgba.a === 1) {
        this.completeEvent.next(ev.hex)
      } else {
        const {r, g, b, a} = ev.rgba
        this.completeEvent.next(`rgba(${r},${g},${b},${a})`)
      }
    }
  }

  update(d?: string): void {
    const color = d || '#f00'
    if (/^#/.test(color)) {
      this.picker.hex = color
    } else if (/^rgba/.test(color)) {
      this.picker.rgba = parseCss(color) as ColorRGBA
    } else if (/^rgb/.test(color)) {
      this.picker.hex = rgb2Hex((parseCss(color) as ColorRGB))
    } else if (/^hsl/.test(color)) {
      this.picker.hex = hsl2Hex((parseCss(color) as ColorHSL))
    }
  }
}
