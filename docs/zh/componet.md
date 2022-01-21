自定义组件
=========================

### 什么是 TextBus 的组件？

我们应当都使用过现代前端框架，如 React、Vue、Angular 等，TextBus 的组件可以看成是前端框架的组件之上额外添加了可编辑插槽功能的模块。和前端框架一样，TextBus 的组件也带有数据模型、生命周期、DOM 模板及样式表。

要创建 TextBus 的组件，只需要调用 `defineComponent` 函数，并编写特定的配置项即可。 一个简单的组件如下：

```tsx
import { defineComponent, ContentType, useSlots, Slot } from '@textbus/core'

export const myComponent = defineComponent({
  type: ContentType.BlockComponent, // 设置组件类型
  name: 'MyComponent',              // 组件的名字，不可重复
  transform(translator, state) {    // 将当前组件 json 数据转换为实例
    return translator.createSlot(state)
  },
  setup(slot) {
    // 组件的具体逻辑
    const slots = useSlots(slot || new Slot([
      ContentType.Text
    ]))
    
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

TextBus 组件支持用 jsx 或 tsx 编写，也可以用 `new VElement('div')` 或者 `new VTextNode('text')` 的方式编写。

上面示例是一个最简单的组件，但它基本包含了 TextBus 组件的基本形态，更复杂的组件，无非是在这个基础上增加更多的逻辑而已。

为了让 TextBus 能从 HTML 中识别出组件，我们还需要创建组件加载器。加载器用于从文档中识别并读取出组件的必要信息，从而生成 TextBus 的组件实例的工具类，由于 TextBus 是跨平台的，所以不同平台的加载器也可能是不同的，我们以 PC 平台为例。


```ts
import { Slot, ContentType } from '@textbus/core'

export const myComponentLoader = {
  // 设置组件的根元素为块级样式
  reources: {
    styles: ['my-component{display:block}']
  },
  match(element) {
    // 匹配一个 DOM 元素，返回 true 即表示为当前组件
    return element.tagName.toLowerCase() === 'my-component'
  },
  read(element, injector, slotParser) {
    // 读取当前 DOM 元素下组件指定的结构，并返回组件实例
    const slot = slotParser(new Slot([
      ContentType.Text
    ]), element.children[0])
    return paragraphComponent.createInstance(injector, slot)
  },
  component: myComponent
}
```

现在我们在编辑器中添加我们刚创建的组件。

```ts
import { Editor } from '@textbus/editor'

const editor = new Editor('#editor', {
  componentLoaders: [
    myComponentLoader
  ]
})
```

我们也可以继续添加一个按钮，点击按钮可以往文档中插入 MyComponent 组件。

```html
<div class="toolbar">
  <button type="button" id="insert-my-component">插入 MyComponent</button>
</div>
<div id="editor"></div>
```

```ts
import { Commander, ContentType } from '@textbus/core'

import { myComponent } from './my-component'

const insertBtn = document.getElementById('insert-my-component')

editor.onReady.subscribe(() => {
  const injector = editor.injector
  const commander = injector.get(Commander)

  insertBtn.addEventListener('click', () => {
    const componentInstance = myComponent.createInstance()
    commander.insert(componentInstance)
  })
})
```

### 数据交互

本章节主要介绍在**组件 setup 函数**内可以调用的一些勾子函数。

#### useContext

返回当前编辑器的注入器，通过注入器，可以获取到编辑器内部各个类的实例

```ts
import { useContext, Commander, defineComponent } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    // 获取注入器
    const injector = useContext()
    // 获取编辑器内部类实例
    const commander = injector.get(Commander)
  }
})
```

#### useSelf

返回当前组件实例

```ts
import { useSelf } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    const componentInstance = useSelf()
  }
})
```

#### useSlots

把一组插槽挂载到文档，一个组件只允许调用一次。

```tsx
import { ContentType, useSlots } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    const slots = useSlots([
      new Slot([
        ContentType.Text
      ])
    ], () => {
      // 当内容恢复时，插槽还原的工厂函数
      return new Slot([
        ContentType.Text
      ])
    })
    return {
      render(isOutputMode, slotRenderFn) {
        return (
          <div>
            {
              slotRenderFn(slots.get(0), () => {
                return <p/>
              })
            }
          </div>
        )
      }
    }
  }
})
```

#### useState

当前组件的自定义状态，一个组件只能调用一次。

```tsx
import { useState } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    let state = {
      width: '100px'
    }
    const stateController = useState(state)

    stateController.onChange.subscribe(newState => {
      state = newState
    })
    return {
      render() {
        return (
          <div>
            <img src="./example.jpg" width={state.width}/>
          </div>
        )
      }
    }
  }
})
```


#### useRef

用于获取 DOM 实例

```tsx
import { useRef, onViewInit } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    const domRef = useRef()
    onViewInit(() => {
      console.log(domRef.current)
    })
    return {
      render() {
        return (
          <div>
            <p ref={domRef}>我的组件</p>
          </div>
        )
      }
    }
  }
})
```

#### useRefs

用于获取一组 DOM 实例，常用在循环中

```tsx
import { useRefs, onViewInit } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    const domRefs = useRefs()
    onViewInit(() => {
      console.log(domRefs)
    })
    return {
      render() {
        return (
          <div>
            <p ref={domRefs}>我的组件</p>
            <p ref={domRefs}>我的组件</p>
          </div>
        )
      }
    }
  }
})
```

#### useDynamicShortcut

组件内部快捷键，用于只在组件内生效的快捷键

```tsx
import { useDynamicShortcut } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    useDynamicShortcut({
      keymap: {
        key: 'Tab'
      },
      action() {
        console.log('Tab 快捷键触发了！')
      }
    })
  }
})
```

### 生命周期

#### onPaste

当组件插槽发生粘贴事件时调用

```tsx
import { onPaste } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onPaste(ev => {
      //
    })
  }
})
```

#### onContextMenu

当用户在组件内点击鼠标右键时调用

```tsx
import { onContextMenu } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onContextMenu(() => {
      return [{
        label: '自定义上下文菜单',
        onClick() {
          //
        }
      }]
    })
  }
})
```

#### onViewChecked

当组件每次视图更新完成后调用

```tsx
import { onViewChecked } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onViewChecked(() => {
      //
    })
  }
})
```

#### onViewInit

当组件第一次视图渲染完成时调用

```tsx
import { onViewInit } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onViewInit(() => {
      //
    })
  }
})
```

#### onSlotRemove

当用户触发组件插槽删除前调用

```tsx
import { onSlotRemove } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onSlotRemove(ev => {
      //
    })
  }
})
```

#### onContentDelete

当用户删除组件插槽内内容时调用
```tsx
import { onContentDelete } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onContentDelete(ev => {
      //
    })
  }
})
```

#### onEnter

当用户在组件插槽内按回车键时调用

```tsx
import { onEnter } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onEnter(ev => {
      //
    })
  }
})
```

#### onInsert

当用户在组件插槽内输入时调用

```tsx
import { onContentInsert } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onContentInsert(ev => {
      //
    })
  }
})
```

#### onInserted

当用户在组件插槽内输入完成时调用

```tsx
import { onContentInserted } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onContentInserted(ev => {
      //
    })
  }
})
```

#### onDestroy

当组件销毁时调用

```tsx
import { onDestroy } from '@textbus/core';

const myCommponent = defineComponent({
  setup() {
    onDestroy(() => {
      //
    })
  }
})
```

