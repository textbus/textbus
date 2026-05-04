import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Textbus',
  description: '组件化、跨平台的富文本框架',
  lang: 'zh-CN',

  vite: {
    optimizeDeps: {
      include: ['monaco-editor', 'esbuild-wasm'],
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
      { text: '文档内示例', link: '/guide/getting-started' },
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
            { text: '协作编辑', link: '/guide/collaborate' },
            { text: '模块与扩展', link: '/guide/editor-and-modules' },
            { text: '浏览器模块', link: '/guide/platform-browser' },
          ],
        },
        {
          text: '包参考',
          collapsed: false,
          items: [
            { text: '概览', link: '/guide/packages' },
            { text: '@textbus/core', link: '/guide/package-core' },
            { text: '@textbus/platform-browser', link: '/guide/package-platform-browser' },
            { text: '@textbus/collaborate', link: '/guide/package-collaborate' },
            { text: '@textbus/adapter-viewfly', link: '/guide/package-adapter-viewfly' },
            { text: '@textbus/adapter-vue', link: '/guide/package-adapter-vue' },
            { text: '@textbus/adapter-react', link: '/guide/package-adapter-react' },
            { text: '@textbus/platform-node', link: '/guide/package-platform-node' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/textbus/textbus' },
    ],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © Textbus',
    },
  },
})
