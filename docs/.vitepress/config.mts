import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export default defineConfig({
  title: 'Textbus',
  description: '组件化、跨平台的富文本框架',
  lang: 'zh-CN',
  /** 生成与导航使用无 `.html` 后缀的路径（如 `/playground`）；静态托管需支持目录索引或回写规则 */
  cleanUrls: true,

  vite: {
    resolve: {
      alias: {
        /**
         * 必须指向各包 **已构建的 dist ESM**（含 design:paramtypes 等 DI 元数据）。
         * 若指向 workspace **源码**，Vite 默认编译会丢装饰器元数据，Viewfly 在 resolveClassParams 处会报错。
         */
        '@textbus/core': path.join(repoRoot, 'packages/core/dist/index.esm.js'),
        '@textbus/platform-browser': path.join(repoRoot, 'packages/platform-browser/dist/index.esm.js'),
        '@textbus/platform-node': path.join(repoRoot, 'packages/platform-node/dist/index.esm.js'),
        '@textbus/adapter-viewfly': path.join(repoRoot, 'packages/adapter-viewfly/dist/index.esm.js'),
        '@textbus/collaborate': path.join(repoRoot, 'packages/collaborate/dist/index.esm.js'),
      },
    },
    optimizeDeps: {
      include: ['monaco-editor', 'esbuild-wasm', '@textbus/xnote', '@textbus/collaborate'],
    },
    ssr: {
      noExternal: [
        '@textbus/core',
        '@textbus/platform-browser',
        '@textbus/platform-node',
        '@textbus/adapter-viewfly',
        '@textbus/xnote',
        '@textbus/collaborate',
        '@viewfly/ui-components',
        '@viewfly/ui-icons',
        '@tanbo/color',
      ],
    },
    worker: {
      format: 'es',
    },
  },

  themeConfig: {
    logo: { src: '/logo.png', alt: 'Textbus' },
    siteTitle: false,

    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: '在线协作', link: '/playground' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '准备',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
        {
          text: '入门',
          items: [
            { text: '组件基础', link: '/guide/component-basics' },
            { text: '文字样式', link: '/guide/text-styles' },
            { text: '块级样式', link: '/guide/block-styles' },
            { text: '选区', link: '/guide/selection' },
            { text: '状态查询与基础操作', link: '/guide/operations-and-query' },
            { text: '历史记录', link: '/guide/history' },
            { text: '快捷键和语法糖', link: '/guide/shortcuts-and-grammar' },
            { text: '组件事件与生命周期', link: '/guide/component-events-and-lifecycle' },
            { text: '文档解析与兼容处理', link: '/guide/document-parse-compat' },
          ],
        },
        {
          text: '概念与进阶',
          items: [
            { text: '核心概念', link: '/guide/concepts' },
            { text: '插槽', link: '/guide/slot' },
            { text: '组件高级', link: '/guide/component-advanced' },
            {
              text: '适配器集成',
              collapsed: false,
              items: [
                { text: 'Viewfly', link: '/guide/adapter-viewfly' },
                { text: 'Vue', link: '/guide/adapter-vue' },
                { text: 'React', link: '/guide/adapter-react' },
              ],
            },
            { text: '适配器与 DOM 查询', link: '/guide/adapter' },
            { text: '协作编辑', link: '/guide/collaborate' },
            { text: '模块与扩展', link: '/guide/editor-and-modules' },
            { text: '浏览器模块', link: '/guide/platform-browser' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/textbus/textbus' },
    ],

    /** 右侧大纲 / 移动端「本页」下拉标题（默认英文 On this page） */
    outline: {
      label: '本页目录',
    },

    /** 移动端侧栏按钮文案（默认 Menu） */
    sidebarMenuLabel: '菜单',

    /** 移动端顶部「返回顶部」 */
    returnToTopLabel: '返回顶部',

    /** 移动端全屏菜单里深浅色区块标题（默认 Appearance） */
    darkModeSwitchLabel: '外观',

    lightModeSwitchTitle: '切换到浅色主题',
    darkModeSwitchTitle: '切换到深色主题',

    /** 键盘导航「跳到正文」 */
    skipToContentLabel: '跳到正文',

    /** 多语言站点时有语言切换按钮时的 aria 文案 */
    langMenuLabel: '切换语言',

    /** 文档底部上一篇 / 下一篇区域标题 */
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    /** 文档底部「最近更新时间」前缀 */
    lastUpdated: {
      text: '更新于',
    },

    /** 默认主题需显式开启；本地索引构建产物随站点部署，无需 Algolia */
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除查询条件',
                backButtonTitle: '关闭搜索',
                noResultsText: '无法找到相关结果',
                footer: {
                  selectText: '跳转',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '向上',
                  navigateDownKeyAriaLabel: '向下',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Escape',
                },
              },
            },
          },
        },
      },
    },

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © Textbus',
    },
  },
})
