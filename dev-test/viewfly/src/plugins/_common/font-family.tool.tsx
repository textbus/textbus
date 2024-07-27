import { inject, onUnmounted, createSignal } from '@viewfly/core'
import { Commander, Query, QueryStateType } from '@textbus/core'

import { Dropdown } from '../../components/dropdown/dropdown'
import { Button } from '../../components/button/button'
import { MenuItem } from '../../components/menu-item/menu-item'
import { RefreshService } from '../../services/refresh.service'
import { fontFamilyFormatter } from '../../textbus/formatters/font-family'

export const isSupportFont = (function () {
  const fullbackFontName = 'Arial'
  const text = 'HeRe-is*SoMe%tEst +99.? !@ #~ &^teXtWw L$VEY$U0'
  const fontSize = 20
  const width = 200
  const height = 50
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = width
  canvas.height = height
  context.textAlign = 'center'
  context.fillStyle = 'black'
  context.textBaseline = 'middle'

  function checker(fontName: string) {
    context.clearRect(0, 0, width, height)
    context.font = fontSize + 'px ' + fontName + ', ' + fullbackFontName
    context.fillText(text, width / 2, height / 2)
    const data: Uint8ClampedArray = context.getImageData(0, 0, width, height).data
    return Array.from(data).filter(n => n !== 0)
  }

  return function (fontName: string) {
    if (fontName.toLowerCase() === fullbackFontName.toLowerCase()) {
      return true
    }
    return checker(fullbackFontName).join('') !== checker(fontName).join('')
  }
})()

export function FontFamilyTool() {
  const currentFontFamily = createSignal('')
  const fontFamilyOptions = [{
    label: '默认',
    value: ''
  }, {
    label: '宋体',
    value: 'SimSun, STSong'
  }, {
    label: '黑体',
    value: 'SimHei, STHeiti'
  }, {
    label: '微软雅黑',
    value: 'Microsoft YaHei'
  }, {
    label: '楷体',
    value: 'KaiTi, STKaiti'
  }, {
    label: '仿宋',
    value: 'FangSong, STFangsong',
  }, {
    label: '冬青黑简体中文',
    value: '"Hiragino Sans GB", 冬青黑简体中文'
  }, {
    label: '苹方',
    value: '"PingFang SC", 苹方'
  }, {
    label: '隶书',
    value: 'SimLi'
  }, {
    label: 'Andale Mono',
    value: 'Andale Mono'
  }, {
    label: 'Arial',
    value: 'Arial'
  }, {
    label: 'Helvetica',
    value: 'Helvetica'
  }, {
    label: 'Impact',
    value: 'Impact'
  }, {
    label: 'Times New Roman',
    value: 'Times New Roman'
  }]

  const commander = inject(Commander)

  function check(v: string) {
    if (v) {
      commander.applyFormat(fontFamilyFormatter, v)
    } else {
      commander.unApplyFormat(fontFamilyFormatter)
    }
  }

  const refreshService = inject(RefreshService)
  const query = inject(Query)

  const highlight = createSignal(false)

  const subscription = refreshService.onRefresh.subscribe(() => {
    const result = query.queryFormat(fontFamilyFormatter)
    const isHighlight = result.state === QueryStateType.Enabled
    highlight.set(isHighlight)
    currentFontFamily.set(isHighlight ? result.value! : '')
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return () => {
    return (
      <Dropdown onCheck={check} menu={
        fontFamilyOptions.map(i => {
          const disabled = i.value ? !i.value.split(',').map(i => isSupportFont(i.trim())).some(v => v) : false
          return {
            label: <MenuItem
              disabled={disabled}
              checked={currentFontFamily() === i.value}>
              {i.label}
            </MenuItem>,
            disabled,
            value: i.value,
          }
        })
      }>
        <Button arrow={true} highlight={highlight()}>{fontFamilyOptions.find(v => {
          return v.value === currentFontFamily()
        })?.label || '默认'}</Button>
      </Dropdown>
    )
  }
}
