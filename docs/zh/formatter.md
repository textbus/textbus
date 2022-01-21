自定义格式
====================

### 什么是 TextBus 的格式

格式，在 TextBus 内，我们叫做 `Formatter`，Formatter 用于修饰插槽的内容，如加粗、字体颜色、边框等等。

创建一个加粗的 Formatter：


```ts
import { FormatType, VElement } from '@textbus/core'

const boldFormatter = {
  // 设置 boldFormatter 是一个行内标签样式
  type: FormatType.InlineTag,
  // 设置 Formatter 名字为 `bold`
  name: 'bold',
  // 当 boldFormatter 渲染时，我们返回一个 strong 标签的虚拟 DOM 节点
  render() {
    return new VElement('strong')
  }
}
```

我们还需要创建一个 loader，让 TextBus 能在 HTML 中识别出加粗的格式。

```ts
export const boldFormatLoader = {
  // 当匹配到一个 DOM 元素的标签为 `strong`、`b` 或者当前元素的样式的 fontWeight 为 500 ~ 900 或者 bold 时，返回 true
  match(element) {
    return ['strong', 'b'].includes(element.tagName.toLowerCase()) ||
      ['bold', '500', '600', '700', '800', '900'].includes(element.style.fontWeight)
  },
  // 当元素匹配成功时，会调用 read 方法获取样式的值，由于加粗只有生效和不生效两种，所以，我们可以用一个 boolean 值来表示，这里可以返回 true 即可
  read() {
    return true
  },
  formatter: boldFormatter
}
```

现在，我们可以把我们创建好的 Formatter 添加到编辑器中了。

```ts
import { Editor } from '@textbus/editor'
import { boldFormatLoader } from './bold-formatter'

const editor = new Editor('#editor', {
  formatLoaders: [
    boldFormatLoader
  ]
})
```
至此，我们的编辑器就可以支持加粗文字的功能了。

等等，我们虽然添加了 boldFormatter，但并没有一个工具去触发，让它在编辑器内动态添加上去。让我们在页面添加一个按钮，当用户点击的时候，就让编辑器内的文字加粗。

```html
<div class="toolbar">
  <button type="button" id="bold-btn">加粗</button>
</div>
<div id="editor"></div>
```

```ts
import { Commander } from '@textbus/core'
import { boldFormatLoader } from './bold-formatter'
import { boldFormatter } from './inline-tag.formatter'

const boldBtn = document.getElementById('bold-btn')

// 当编辑器准备好时，我们再添加功能
editor.onReady.subscribe(() => {
  const injector = editor.injector
  const commander = injector.get(Commander)
  boldBtn.addEventListener('click', () => {
    commander.applyFormat(boldFormatter, true)
  })
})
```

现在，我们框选一段文字并点击加粗按钮时，你就会看到文字已经加粗了，如果，光标是闭合的，TextBus 也会智能加粗后面输入的文字。

在实际的应用中，仅仅文字加粗是不满足需求的，我们更希望如果已经加粗了，则取消加粗。这时，则需要状态查询来帮助我们完成相应的功能。让我们继续完善上面的功能。

```ts
import { Commander, Query, QueryStateType } from '@textbus/core'
import { boldFormatLoader } from './bold-formatter'
import { boldFormatter } from './inline-tag.formatter'

const boldBtn = document.getElementById('bold-btn')

// 当编辑器准备好时，我们再添加功能
editor.onReady.subscribe(() => {
  const injector = editor.injector
  const commander = injector.get(Commander)
  const query = injector.get(Query)
  boldBtn.addEventListener('click', () => {
    // 通过 Query，查询当前光标所在范围是否已加粗
    const queryState = query.queryFormat(boldFormatter)
    const isBold = queryState.state === QueryStateType.Enabled
    
    // 如果已加粗，我们则取消应用加粗效果，否则就加粗
    if (isBold) {
      commander.unApplyFormat(boldFormatter)
    } else {
      commander.applyFormat(boldFormatter, true)
    }
  })
})
```

现在我们可以根据查询状态，分别设置应用或取消应用样式了，我们还需要实时监听编辑器内容的变化，让按钮呈现高亮的效果，给用户更好的反馈。

```ts
import { Commander, Query, QueryStateType, Renderer } from '@textbus/core'
import { boldFormatLoader } from './bold-formatter'
import { boldFormatter } from './inline-tag.formatter'

const boldBtn = document.getElementById('bold-btn')

// 当编辑器准备好时，我们再添加功能
editor.onReady.subscribe(() => {
  const injector = editor.injector
  const commander = injector.get(Commander)
  const query = injector.get(Query)
  const renderer = injector.get(Renderer)
  
  renderer.onViewChecked.subscribe(() => {
    const queryState = query.queryFormat(boldFormatter)
    const isBold = queryState.state === QueryStateType.Enabled
    
    // 根据编辑器实时状态，高亮显示按钮
    if (isBold) {
      boldBtn.classList.add('active')
    } else {
      boldBtn.classList.remove('active')
    }
  })
  boldBtn.addEventListener('click', () => {
    // 通过 Query，查询当前光标所在范围是否已加粗
    const queryState = query.queryFormat(boldFormatter)
    const isBold = queryState.state === QueryStateType.Enabled
    
    // 如果已加粗，我们则取消应用加粗效果，否则就加粗
    if (isBold) {
      commander.unApplyFormat(boldFormatter)
    } else {
      commander.applyFormat(boldFormatter, true)
    }
  })
})
```

至此，我们的加粗工具，就基本完成了。

