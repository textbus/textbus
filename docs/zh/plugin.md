自定义插件
============================

### 什么是 TextBus 的插件

在大多数情况下，我们不需要开发插件，因为组件有相对完善的功能，已经能完成我们的大部分工作。插件只是作为编辑器额外功能补充而存在。如工具条，编辑器本身并不一定需要一个工具条，但工具条能帮我们更简单的使用特定的功能。事实上，在 TextBus 内部，整个工具条，也是以插件的形式而存在的。

和其它编辑器不同的是，在 TextBus 中，工具条作为一个插件，工具条上面的工具是对工具条这个插件的扩展。在其它编辑器中，工作条是作为一个基础库出现的，而把工具条中的的工具叫做插件。

### 第一个插件

在 TextBus 中，插件只是一个带有 setup 方法的对象，TextBus 会在初始化时调用这个方法，并传入 injector 对象，通过 injector 对象，你可以获取到 TextBus 内部所有类的实例。

如我们要实现一个兼听数据变化的插件

```ts
import { Editor } from '@textbus/editor'

const myPlugin = {
  setup(injector) {
    const editor = injector.get(Editor)
    editor.onChange.subscribe(() => {
      console.log('数据变化了！')
    })
  }
}

const editor = new Editor('#editor', {
  plugins: [
    myPlugin
  ]
})
```

关于 injector 相关问题，请查看[高级](./advance.md)
