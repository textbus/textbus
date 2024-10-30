import {
  any2Hsl,
  ColorHSL, ColorHSV, ColorRGB, ColorRGBA, hex2Hsl, hex2Hsv, hex2Rgb,
  hsl2Hex, hsl2Hsv, hsl2Rgb, hsv2Hex, hsv2Hsl, hsv2Rgb, normalizeHex, parseCss, rgb2Hex, rgb2Hsl, rgb2Hsv
} from '@tanbo/color'
import { withScopedCSS } from '@viewfly/scoped-css'
import { fromEvent } from '@textbus/core'
import { createRef, createSignal, getCurrentInstance } from '@viewfly/core'

import css from './color-picker.scoped.scss'

export class Picker {
  set hex(color: string) {
    const c = color ? normalizeHex(color) : null
    if (c) {
      this.empty = false
      this._hex = c
      this._hsl = hex2Hsl(c)
      this._rgb = hex2Rgb(c)
      this._hsv = hex2Hsv(c)
      this._rgba = {
        ...this._rgb,
        a: this.resetAlpha ? 1 : this._rgba?.a || 1
      }
    } else {
      this.empty = true
    }
    this.resetAlpha = true
    this.onChange()
  }

  get hex(): string | null {
    return this.empty ? null : this._hex
  }

  set hsl(color: ColorHSL) {
    if (!color || typeof color.h !== 'number' || typeof color.s !== 'number' || typeof color.l !== 'number') {
      this.empty = true
    } else {
      this.empty = false
      this._hsl = color
      this._hex = hsl2Hex(color)
      this._hsv = hsl2Hsv(color)
      this._rgb = hsl2Rgb(color)
      this._rgba = {
        ...this._rgb,
        a: this.resetAlpha ? 1 : this._rgba?.a || 1
      }
    }
    this.resetAlpha = true
    this.onChange()
  }

  get hsl(): ColorHSL | null {
    return this.empty ? null : this._hsl
  }

  set rgb(color: ColorRGB) {
    if (!color || typeof color.r !== 'number' || typeof color.g !== 'number' || typeof color.b !== 'number') {
      this.empty = true
    } else {
      this.empty = false
      this._rgb = color
      this._rgba = {
        ...color,
        a: this.resetAlpha ? 1 : this._rgba?.a || 1
      }
      this._hsl = rgb2Hsl(color)
      this._hex = rgb2Hex(color)
      this._hsv = rgb2Hsv(color)
    }

    this.resetAlpha = true
    this.onChange()
  }

  get rgb(): ColorRGB | null {
    return this.empty ? null : this._rgb
  }

  set rgba(color: ColorRGBA) {
    if (!color ||
      typeof color.r !== 'number' ||
      typeof color.g !== 'number' ||
      typeof color.b !== 'number' ||
      typeof color.a !== 'number') {
      this.empty = true
    } else {
      this.empty = false
      this._rgba = color
      this._hsl = rgb2Hsl(color)
      this._hex = rgb2Hex(color)
      this._hsv = rgb2Hsv(color)
    }
    this.onChange()
  }

  get rgba(): ColorRGBA | null {
    return this.empty ? null : this._rgba
  }

  set hsv(color: ColorHSV) {
    if (!color || typeof color.h !== 'number' || typeof color.s !== 'number' || typeof color.v !== 'number') {
      this.empty = true
    } else {
      this.empty = false
      this._hsv = color
      this._hex = hsv2Hex(color)
      this._hsl = hsv2Hsl(color)
      this._rgb = hsv2Rgb(color)
      this._rgba = {
        ...this._rgb,
        a: this.resetAlpha ? 1 : this._rgba?.a || 1
      }
    }
    this.resetAlpha = true
    this.onChange()
  }

  get hsv(): ColorHSV | null {
    return this.empty ? null : this._hsv
  }

  private _hex = ''
  private _hsl: ColorHSL | null = null
  private _rgb: ColorRGB | null = null
  private _hsv: ColorHSV | null = null
  private _rgba: ColorRGBA | null = null

  empty = false
  resetAlpha = true

  writing = false

  constructor(private onChange: () => void, value?: string) {
    this.hex = value || '#f00'
  }
}

export interface ColorPickerProps {
  value?: string

  onChange?(picker: Picker): void

  onSelected(picker: Picker): void
}

const recentColors = createSignal<string[]>([])

export function ColorPicker(props: ColorPickerProps) {
  const instance = getCurrentInstance()
  const picker = new Picker(() => {
    instance.markAsDirtied()
  }, props.value)

  const mainColors: string[] = [
    '#000', '#333', '#444', '#555', '#666', '#777', '#888',
    '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#eee', '#fff',
  ]
  const colors: string[] = [
    '#fec6c2', '#fee5c3', '#fefcc3', '#baf6c4', '#c3ebfe', '#c3cbfe', '#e1caff',
    '#fc8e88', '#fccc88', '#fcf888', '#76ec8a', '#88d8fc', '#97a4fb', '#c098f4',
    '#ff6666', '#ffb151', '#fada3a', '#18c937', '#3aaafa', '#6373e2', '#a669f7',
    '#f63030', '#f88933', '#deb12a', '#038e23', '#1276cc', '#3f52ce', '#8838ed',
    '#c60000', '#d86912', '#b88811', '#086508', '#144c93', '#1b2eaa', '#6117bf',
  ]


  function addRecentColor() {
    const color = picker.hex
    if (!color) {
      return
    }
    const colors = recentColors().filter(item => {
      return item !== color
    })
    colors.unshift(color)
    if (colors.length >= 7) {
      colors.length = 7
    }
    recentColors.set(colors)
  }

  const paletteRef = createRef<HTMLElement>()

  function bindPaletteEvent(ev: MouseEvent) {
    const update = (ev: MouseEvent) => {
      const position = paletteRef.current!.getBoundingClientRect()
      const offsetX = ev.clientX - position.left
      const offsetY = ev.clientY - position.top

      let s = offsetX / 130 * 100
      let v = 100 - offsetY / 130 * 100

      s = Math.max(0, s)
      s = Math.min(100, s)

      v = Math.max(0, v)
      v = Math.min(100, v)
      picker.resetAlpha = false
      picker.hsv = {
        h: picker.hsv!.h,
        s,
        v
      }
      props.onChange?.(picker)
    }

    update(ev)

    const unMouseMove = fromEvent<MouseEvent>(document, 'mousemove').subscribe(ev => {
      update(ev)
    })

    const unMouseUp = fromEvent<MouseEvent>(document, 'mouseup').subscribe(() => {
      unMouseMove.unsubscribe()
      unMouseUp.unsubscribe()
    })
  }

  const hueBarRef = createRef<HTMLDivElement>()

  function bindHueBarEvent(ev: MouseEvent) {
    const update = (ev: MouseEvent) => {
      const position = hueBarRef.current!.getBoundingClientRect()
      let offsetY = ev.clientY - position.top

      offsetY = Math.max(0, offsetY)
      offsetY = Math.min(100, offsetY)

      const h = 360 / 100 * offsetY

      picker.resetAlpha = false
      picker.hsv = {
        h,
        s: picker.hsv!.s,
        v: picker.hsv!.v
      }
      props.onChange?.(picker)
    }

    update(ev)

    const unMouseMove = fromEvent<MouseEvent>(document, 'mousemove').subscribe(ev => {
      update(ev)
    })

    const unMouseUp = fromEvent<MouseEvent>(document, 'mouseup').subscribe(() => {
      unMouseMove.unsubscribe()
      unMouseUp.unsubscribe()
    })
  }

  const alphaBarRef = createRef<HTMLElement>()

  function bindAlphaEvent(ev: MouseEvent) {
    const update = (ev: MouseEvent) => {
      const position = alphaBarRef.current!.getBoundingClientRect()
      let offsetX = ev.clientX - position.left

      offsetX = Math.max(0, offsetX)
      offsetX = Math.min(position.width, offsetX)
      picker.rgba = {
        ...picker.rgba!,
        a: offsetX / position.width
      }
      props.onChange?.(picker)
    }

    update(ev)

    const unMouseMove = fromEvent<MouseEvent>(document, 'mousemove').subscribe(ev => {
      update(ev)
    })

    const unMouseUp = fromEvent<MouseEvent>(document, 'mouseup').subscribe(() => {
      unMouseMove.unsubscribe()
      unMouseUp.unsubscribe()
    })
  }

  function bindInputsEvent(ev: InputEvent) {
    const updateByHSL = (h: number, s: number, l: number) => {
      picker.hex = hsl2Hex({ h, s, l })
      props.onChange?.(picker)
    }
    const updateByRGB = (r: number, g: number, b: number) => {
      picker.hex = rgb2Hex({ r, g, b })
      props.onChange?.(picker)
    }

    picker.writing = true
    const el = ev.target as HTMLInputElement
    const model = el.getAttribute('data-model')
    if (el.type === 'number') {
      const min = +el.min
      const max = +el.max

      el.value = Math.max(+el.value, min) + ''
      el.value = Math.min(+el.value, max) + ''
    }

    const { h, s, l } = picker.hsl!
    const { r, g, b } = picker.rgb!
    switch (model) {
      case 'H':
        updateByHSL(+el.value, s, l)
        break
      case 'S':
        updateByHSL(h, +el.value, l)
        break
      case 'L':
        updateByHSL(h, s, +el.value)
        break
      case 'R':
        updateByRGB(+el.value, g, b)
        break
      case 'G':
        updateByRGB(r, +el.value, b)
        break
      case 'B':
        updateByRGB(r, g, +el.value)
        break
      case 'HEX':
        if (/^#(([0-9a-f]){3}){1,2}$/i.test(el.value)) {
          picker.hex = el.value
          props.onChange?.(picker)
        }
        break
    }
    picker.writing = false
  }

  const isShowPalette = createSignal(false)

  function selected() {
    props.onSelected(picker)
    addRecentColor()
    isShowPalette.set(false)
  }

  function bindColorOptionsEvent(ev: MouseEvent) {
    const target = ev.target as HTMLElement
    if (!target.hasAttribute('data-color')) {
      return
    }
    const c = target.getAttribute('data-color')!
    if (/^rgba/.test(c)) {
      picker.rgba = parseCss(c) as ColorRGBA
    } else {
      picker.hex = c
    }
    props.onSelected(picker)
    addRecentColor()
  }

  return withScopedCSS(css, () => {
    return (
      <div onMousedown={ev => {
        ev.stopPropagation()
        if (ev.target instanceof HTMLInputElement) {
          return
        }
        ev.preventDefault()
      }} class={{
        'xnote-color-picker': true,
        'xnote-color-picker-show-palette': isShowPalette()
      }}>
        <div class="xnote-color-picker-preset" onClick={bindColorOptionsEvent}>
          <div class="xnote-color-picker-swatches" style="height: 50px">
            {
              mainColors.map(color => {
                const hsl = (any2Hsl(color) || {}) as any
                return (
                  <div data-color={color} class={{
                    'xnote-color-picker-current': hsl.l === picker.hsl?.l && hsl.s === picker.hsl?.s && hsl.h === picker.hsl?.h,
                  }} style={{
                    background: color
                  }}></div>
                )
              })
            }
          </div>
          <div class="xnote-color-picker-swatches" style="height: 118px;">
            {
              colors.map(color => {
                return (
                  <div data-color={color} style={{
                    background: color
                  }}></div>
                )
              })
            }
          </div>
          <div class="xnote-color-picker-recent-text">最近颜色</div>
          <div class="xnote-color-picker-swatches" style="height: 25px;">
            {
              Array.from({ length: 7 }).map((_, index) => {
                const colors = recentColors()
                const color = colors[index] || ''
                return (
                  <div data-color={color || 'unknown'} style={{
                    background: color
                  }}></div>
                )
              })
            }
          </div>
          <div class="xnote-color-picker-flex">
            <div class="xnote-color-picker-swatches">
              <div data-color=""></div>
            </div>
            <button type="button" class="xnote-color-picker-to-palette" onClick={() => {
              isShowPalette.set(true)
            }}>调色盘
              <svg style="vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1"
                   xmlns="http://www.w3.org/2000/svg">
                <path transform="rotate(180, 512, 512)" d="M497.92 165.12L422.4 89.6 0 512l422.4 422.4 75.52-75.52L151.04 512z"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="xnote-color-picker-menu">
          <div class="xnote-color-picker-back-btn-wrap">
            <button type="button" class="xnote-color-picker-back-btn" onClick={() => {
              isShowPalette.set(false)
            }}>
              <svg style="vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1"
                   xmlns="http://www.w3.org/2000/svg">
                <path d="M497.92 165.12L422.4 89.6 0 512l422.4 422.4 75.52-75.52L151.04 512z"></path>
              </svg>
              返回
            </button>
          </div>
          <div class="xnote-color-picker-viewer">
            <div class="xnote-color-picker-viewer-left">
              <div class={[
                'xnote-color-picker-palette',
                {
                  'xnote-color-picker-palette-empty': picker.empty
                }
              ]} style={{
                background: picker.empty ? '' : `linear-gradient(to right, #fff, hsl(${picker.hsv?.h}, 100%, 50%))`
              }} ref={paletteRef} onMousedown={bindPaletteEvent}>
                <div class="xnote-color-picker-palette-point" style={{
                  left: `calc(${picker.hsv?.s}% - 6px)`,
                  top: `calc(${100 - (picker.hsv?.v || 0)}% - 6px)`
                }}></div>
              </div>
              <div class="xnote-color-picker-viewer-alpha">
                <div class="xnote-color-picker-viewer-alpha-pointer" style={{
                  left: picker.empty ? '100%' : (picker.rgba?.a || 0) * 100 + '%',
                }}></div>
                <div class="xnote-color-picker-viewer-alpha-bar"
                     style={{
                       background: picker.empty ? '' : `linear-gradient(to right, transparent, ${picker.hex})`
                     }}
                     onMousedown={bindAlphaEvent}
                     ref={alphaBarRef}></div>
              </div>
            </div>
            <div class="xnote-color-picker-viewer-right">
              <div class="xnote-color-picker-tools">
                <div class="xnote-color-picker-value">
                  <div class="xnote-color-picker-value-color" style={{
                    background: picker.empty ? '' : `rgba(${picker.rgba?.r}, ${picker.rgba?.g}, ${picker.rgba?.b}, ${picker.rgba?.a})`
                  }}></div>
                </div>
                <div class="xnote-color-picker-hue-bar" ref={hueBarRef} onMousedown={bindHueBarEvent}>
                  <div class="xnote-color-picker-hue-pointer" style={{
                    top: `calc(${picker.hsv!.h / 360 * 100}% - 4px)`
                  }}></div>
                </div>
              </div>
              <div class="xnote-color-picker-viewer-alpha-value">
                {Number(picker.rgba?.a.toFixed(2))}
              </div>
            </div>
          </div>
          <div class="xnote-color-picker-inputs" onInput={bindInputsEvent as (ev: Event) => void}>
            <div class="xnote-color-picker-hsl">
              <div>H <input data-model="H" min="0" max="360" type="number" value={picker.hsl?.h}/></div>
              <div>S <input data-model="S" min="0" max="100" type="number" value={picker.hsl?.s}/></div>
              <div>L <input data-model="L" min="0" max="100" type="number" value={picker.hsl?.l}/></div>
            </div>
            <div class="xnote-color-picker-rgb">
              <div>R <input data-model="R" min="0" max="255" type="number" value={picker.rgb?.r}/></div>
              <div>G <input data-model="G" min="0" max="255" type="number" value={picker.rgb?.g}/></div>
              <div>B <input data-model="B" min="0" max="255" type="number" value={picker.rgb?.b}/></div>
            </div>
            <div class="xnote-color-picker-hex">
              <div>HEX <input data-model="HEX" type="text" value={picker.hex}/></div>
            </div>
          </div>
          <div class="xnote-color-picker-btn-wrap">
            <button type="button" class="xnote-color-picker-btn" onClick={selected}>确定</button>
          </div>
        </div>
      </div>
    )
  })
}
