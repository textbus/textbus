<h1 align="center">Textbus</h1>

🚀 Textbus 是一个组件化、跨平台、数据驱动的富文本框架，支持使用 [Viewfly](https://github.com/viewfly/viewfly)、Vue、React 渲染富文本内容，并坚定的支持在线**多人协作**。你可以在 Textbus 中轻松创建出类似钉钉文档、石墨文档、飞书文档等完全自定义的编辑器。

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green">
  <img src="https://img.shields.io/npm/v/%40textbus%2Fcore">
  <img src="https://img.shields.io/npm/dm/%40textbus/core">
</p>

## 官方文档

[Textbus 官方文档](https://textbus.io)

### XNote 编辑器

XNote 是 Textbus 官方基于最新 4.0 版本开发的一个无头的、高性能的开源富文本编辑器。提供了开箱即用的大多数功能。也为需要自己开发编辑器的开发者提供了第一手的参考资料，仓库地址： [https://github.com/textbus/xnote](https://github.com/textbus/xnote)。

你也可以直接查看在线演示：[在线演示](https://textbus.io/playground)

介绍
-------------------------------------------------------------

我们一直致力于让富文本开发也能像普通前端框架一样，通过简明易懂的 api 和少量的约定，即可开发出使用流畅、交互丰富的富文本应用。

为了解决传统富文本开发的难题，Textbus 首次在富文本中引入了组件的概念，这让富文本开发就像拼积木一样，不再是前端领域不可跨越的天坑。不管你是富文本开发领域的老鸟，亦或是前端的新手，Textbus 都将帮助你把富文本做得更好。

### Textbus 的特点

+  **组件化**：根据富文本的特点而专门开发的组件化系统，让富文本编辑支持复杂布局，插入特殊控件等就像现代前端框架一样，非常的简单。
+ **完全可控**：由于 Textbus 采用完全的数据驱动，输入输出完全依赖内核来完成，在不同的浏览器上，不会存在不一样的行为和结果。
+ **易扩展**：hooks 风格的扩展代码，让你在不同上下文中对同样事件定制不同的行为变得异常简单。原生支持多种前端框架渲染，让你编写复杂交互更容易。
+ **语法糖支持**：高度灵活的语法糖支持，你可以非常灵活的定制输入实时转换功能，如 Markdown 中的 # 号 + 空格变为标题等，你也可以完全自创语法，只要你开心。
+ **格式兼容**：完全可定制的文档解析能力，可以让你最大可能的保持从网页、word 等其它页面复制过来的内容和格式。
+ **格式限制**：既可以做到组件深层次嵌套，也可以做到像现在大多数编辑器一样 block 化。
+ **转换便捷**：内置功能强大的格式转换能力，这也是富文本的难点之一，尤其是对于支持树状数据结构的编辑器来说，要实现这一点非常复杂。
+ **支持在线协作**：Textbus 官方目前提供了基于 Yjs 的协作能力支持，你也可以采用其它的协作方案来对接 Textbus 的数据模型。
+ **高度抽象**：完全抽象的光标和选区系统，你不需要再关心浏览器复杂的选区问题。


### 模块

| 模块                        | 作用                                                                                    |
|:--------------------------|:--------------------------------------------------------------------------------------|
| @textbus/core             | 核心模块，提供了组件、插槽、格式、属性的数据模型抽象和选区、格式变换、渲染、组件生命周期管理、编辑器控制、历史记录、快捷键管理、语法糖管理、输出转换等富文本核心能力的实现 |
| @textbus/platform-browser | 浏览器支持中间层，提供了基本的视图层，桥接了选区、光标、和 DOM 渲染能力                                                |
| @textbus/collaborate      | 协作支持模块，提供了基于 Yjs 的协作对接能力                                                              |
| @textbus/adapter-viewfly  | Textbus 视图渲染 Viewlfy 适配器，可使用 Viewfly 渲染富文本内容                                          |
| @textbus/adapter-vue      | Textbus 视图渲染 vue 适配器，可使用 vue 渲染富文本内容                                                  |
| @textbus/adapter-react    | Textbus 视图渲染 react 适配器，可使用 react 渲染富文本内容                                              |
| @textbus/platform-node    | 适用于 node 后台运行的 Textbus 的实用工具集                                                         |


## 本地开发

Textbus 采用 pnpm 作为多模块管理，全局安装 pnpm。

```
npm install pnpm -g
```

克隆 Textbus 仓库，并安装依赖。

```
git clone git@github.com:textbus/textbus.git
cd textbus
pnpm install
```

启动开发环境。

```
npm start
```

## 赞助

Textbus 的成长离不开社会的支持，如果 Textbus 为你带来了帮助，并且你也认同为知识付费，同时鼓励我们做的更好，欢迎通过下面的二维码表达你的支持

![](./_source/wx.jpg) ![](./_source/alipay.jpg)
