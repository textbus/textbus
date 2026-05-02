# 快速开始

若尚未阅读产品定位与模块划分，建议先看 [简介](./introduction)。

本仓库的 `docs/` 即 **Textbus** 在 **textbus.io** 发布的官方文档源码，线上站点与此同源，**没有另外一套「官网文档」**。下文「本地开发」仅面向参与编写文档的维护者。

## 本地开发

在仓库根目录执行：

```bash
pnpm docs:dev
```

浏览器访问终端里提示的本地地址（默认为 `http://localhost:5173`）。

## 构建静态站点

```bash
pnpm docs:build
```

产物输出到 `docs/.vitepress/dist`，可用任意静态服务器托管；预览：

```bash
pnpm docs:preview
```

## 下一步

- 在 `.vitepress/config.mts` 中扩展 `themeConfig.nav` 与 `themeConfig.sidebar`。
- 在 `docs/` 下新增 Markdown 页面，并按需在侧边栏注册链接。
