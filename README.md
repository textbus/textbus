TextBus 富文本编辑器 2.0
================================

我们一直致力于让富文本开发也能像普通前端框架一样，通过简明易懂的 api 和少量的约定，即可编写出健壮的，可预期的行为。在 TextBus 1.0 的时，我们为此做了非常多的探索和努力，取得了不错的成果，但也因为如此，1.0 的设计在某些方面还留下一些遗憾。

幸运的是，TextBus 2.0 即将面世，我们在 1.0 的成果之上，重新设计了整个架构，致力于更简洁的 api，更友好的开发接入方式。

+ 重新设计了组件系统，去掉了大家难以理解的装饰器，改为用类似 vue 的 setup 形式开发组件，并提供了一系列的 hooks 供大家定制交互行为
+ 重新设计了数据模型，可根据用户的操作生成特定的底层原子命令，这让细粒度的历史记录和文档协同成为可能
+ 核心架构脱离了具体平台，让 TextBus 的能力不仅限于在 PC 端，通过编写特定的中间层，可以方便的在移动端，甚至小程序上实现丰富的富文本能力
+ 重写了渲染层，现在 TextBus 2.0 大多数情况下更新视图仅需要 1ms 时间，比 1.0 性能更好

## 安装

```
# 还未发布
```

## 使用

```ts
import { createEditor } from '@textbus/editor'

const editor = createEditor('#editor')

editor.onChange.subscribe(() => {
  const content = editor.getContent()
  console.log(content)
})
```


## 组件

和前端框架一样，组件是指带有特定交互行为或结构的一个单独功能模块。要创建一个组件，只需要调用 `defineComponent` 函数，并编写特定的配置项即可。

```tsx
import { defineComponent, ContentType, useSlots } from '@textbus/core'

export const myComponent = defineComponent({
  type: ContentType.BlockComponent, // 设置组件类型
  name: 'MyComponent',              // 组件的名字，不可重复
  transform(translator, state) {    // 将当前组件 json 数据转换为实例
    return translator.createSlot(state)
  },
  setup(slot) {
    // 组件的具体逻辑
    const slots = useSlots(slot)
    
    return {
      render(isOutputMode, slotRender) {
        return (
          <my-component>
            {
              slotRender(slots.get(0), () => {
                return <div/>
              })
            }
          </my-component>
        )
      },
      toJSON() {
        slots.get(0).toJSON()
      }
    }
  }
})
```

上面示例是一个最简单的组件，但它基本包含了 TextBus 组件的基本形态，更复杂的组件，无非是在这个基础上增加更多的逻辑而已。

## 组件加载器

组件加载器用于从文档中识别并读取出组件的必要信息，从而生成 TextBus 的组件实例的工具类，由于 TextBus 是跨平台的，所以不同平台的加载器也可能是不同的，我们以 PC 平台为例。

```ts
import { Slot, ContentType } from '@textbus/core'

export const myComponentLoader = {
  match(element) {
    // 匹配一个 DOM 元素，返回 true 即表示为当前组件
    return element.tagName.toLowerCase() === 'my-component'
  },
  read(element, injector, slotParser) {
    // 读取当前 DOM 元素下组件指定的结构，并返回组件实例
    const slot = slotParser(new Slot([
      ContentType.Text,
      ContentType.InlineComponent
    ]), element.children[0])
    return paragraphComponent.createInstance(injector, slot)
  },
  component: myComponent
}
```

## 格式

格式是指对文档中，插槽内（可编辑片段）的文本进行美化或增强的附加信息，如加粗、对齐方式等。

```ts
import { FormatType, VElement } from '@textbus/core'

export const boldFormatter = {
  type: FormatType.InlineTag,
  name: 'bold',
  render() {
    return new VElement('strong')
  }
}
```

## 格式加载器

格式加载器用于从文档中识别并读取出格式信息，由于 TextBus 是跨平台的，所以不同平台的加载器也可能是不同的，我们以 PC 平台为例。

```ts
export const boldFormatLoader = {
  match(element) {
    return ['strong', 'b'].includes(element.tagName.toLowerCase()) || 
      ['bold', '500', '600', '700', '800', '900'].includes(element.style.fontWeight)
  },
  read() {
    return true
  },
  formatter: boldFormatter
}
```

## 创建自定义编辑器

把我们定义好的组件和格式添加到编辑器中。

```ts
import { createEditor } from '@textbus/editor'

import { myComponentLoader } from './my-component'
import { boldFormatLoader } from './bold-formatter'

const editor = createEditor('#editor', {
  componentLoaders: [
    myComponentLoader
  ],
  formatLoaders: [
    boldFormatLoader
  ]
})
```

至此，我们就扩展了自己的组件和格式，我们可以按照此方法，继续编写出任意你想要的组件和格式。
