# 快速开始

若尚未阅读产品定位与模块划分，建议先看 [简介](./introduction)。

本篇用 **Vite + TypeScript + Viewfly** 搭一个可输入、可换行的最小编辑器：**`@textbus/core`** 提供模型与内核，**`@textbus/platform-browser`** 负责浏览器侧挂载与输入，**`@textbus/adapter-viewfly`** 把文档渲染成 Viewfly 视图。使用 **Vue** 或 **React** 时无需 Viewfly 依赖，接入方式见 [Vue 适配器](./adapter-vue)、[React 适配器](./adapter-react)。

## 你会学到什么

- 安装最小 npm 依赖组合  
- 满足装饰器与 JSX 的工程配置  
- 依次装配 **`ViewflyAdapter`**、**`BrowserModule`**，用 **`new Textbus`** 创建实例并 **`render`**

## 1. 创建工程并安装依赖

在本地新建 Vite 项目（**Vanilla + TypeScript** 模板）：

```bash
# Vanilla + TypeScript 模板，便于接 Viewfly JSX
npm create vite@latest my-textbus-editor -- --template vanilla-ts
cd my-textbus-editor
npm install
```

安装 Textbus 与 Viewfly 相关包（版本号请与当前 npm 上的 **5.x** 主线对齐，下列为示例区间）：

```bash
# reflect-metadata：装饰器元数据；其余为内核、浏览器层、Viewfly 适配与运行时
npm install reflect-metadata @textbus/core @textbus/platform-browser @textbus/adapter-viewfly @viewfly/core @viewfly/platform-browser
npm install -D vite typescript @types/node
```

将入口文件改为 **`src/App.tsx`**（若仍是 `main.ts`，请改名并在 `index.html` 里把脚本指向 `/src/App.tsx`）。

## 2. 配置 TypeScript 与 Vite

内核依赖 **装饰器元数据**，且示例使用 **Viewfly JSX**。请将 `tsconfig.json` 调整为至少包含：

::: code-group

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    // Viewfly：react-jsx 自动运行时，解析入口 @viewfly/core
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core",
    // 装饰器 + emitDecoratorMetadata：Textbus 依赖注入所需
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // 与装饰器字段初始化顺序配套（与仓库示例一致）
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src"]
}
```

```ts [vite.config.ts]
import { defineConfig } from 'vite'

export default defineConfig({
  esbuild: {
    // 与 tsconfig 中 jsxImportSource 一致
    jsx: 'automatic',
    jsxImportSource: '@viewfly/core'
  },
  optimizeDeps: {
    esbuildOptions: {
      // 预构建依赖时同样指定 Viewfly JSX
      jsx: 'automatic',
      jsxImportSource: '@viewfly/core'
    }
  }
})
```

:::

`useDefineForClassFields` 设为 **`false`** 可避免部分装饰器与类字段组合下的反常行为（与当前仓库示例一致）。

## 3. 页面 HTML

根目录 **`index.html`** 提供 Viewfly 挂载点 **`#root`**；**`App.tsx`** 内由组件渲染 **`#editor-host`**（**`.tb-editor-host`** 需有足够 **`min-height`**，示例为 `240px`），否则编辑区不易点击或获得焦点：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Textbus 最小示例</title>
    <style>
      body {
        margin: 0;
        padding: 1rem;
      }
      /* 编辑区须有足够高度，否则不易点击或获得焦点 */
      .tb-editor-host {
        min-height: 240px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <!-- Viewfly 挂载点 -->
    <div id="root"></div>
    <!-- 入口：App.tsx 第一行须为 import 'reflect-metadata' -->
    <script type="module" src="/src/App.tsx"></script>
  </body>
</html>
```

## 4. 组件、适配器与入口

本篇示例包含三个文件：**`App.tsx`**、**`components/root.component.tsx`**、**`components/paragraph.component.tsx`**（你可放在 `src/` 或习惯的目录下）。视图里：**只有插槽渲染工厂**（传给 **`adapter.slotRender` 的第二个参数**）需要用 **`createVNode`** 包住内核给出的子节点；**插槽以外的 DOM** 可用 **Viewfly JSX**（参见 [组件基础](./component-basics) 中的 **`TodoRowView`**）。

你可以在下面修改示例并切换到「预览」查看效果；若要与上文本地工程完全一致，仍请将代码拷入你自己的项目并按前文安装依赖、配置 TypeScript 与 Vite。

<TextbusPlayground />

## 5. 运行与验证

```bash
# 浏览器打开终端输出的本地地址，验证编辑区可输入、Enter 换行
npm run dev
```

在浏览器中打开本地地址，点击编辑区域应可输入文字；**Enter** 换行会插入新段落（由 `ParagraphComponent` 中 **`onBreak`** 处理；钩子总览见 [组件事件与生命周期](./component-events-and-lifecycle)）。

## 常见问题

- **`reflect-metadata` 必须在入口最先加载**：否则装饰器元数据不完整，可能导致运行时依赖注入异常。请保持 **`import 'reflect-metadata'`** 为 **`App.tsx` 的第一条语句**（先于其它 `@textbus/*` 模块）。
- **JSX 与 `jsxImportSource`**：`tsconfig.json` 与 **`vite.config.ts`** 中的 **`jsxImportSource`** 均应对准 **`@viewfly/core`**，否则视图组件无法正确编译。
- **销毁实例**：页面卸载时若需释放编辑器，应对 **`Textbus`** 实例调用 **`destroy()`**（本示例未演示路由场景，集成到 SPA 时请注意）。

## 接下来

- 在同一工程上继续扩展：按 **入门**顺序从 [组件基础](./component-basics) 读到 [文档解析与兼容处理](./document-parse-compat)  
- 名词系统整理：[核心概念](./concepts)  
- 插件与内核扩展细节：[模块与扩展（进阶）](./editor-and-modules)  
- 协作：[协作编辑](/integrate/collaborate)  
- 包级 API 索引：[API 概览](/api/)
