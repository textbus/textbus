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
      { text: '在线演示', link: 'https://textbus.io/playground' },
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
            { text: '模块与扩展（进阶）', link: '/guide/editor-and-modules' },
            { text: '浏览器平台层', link: '/guide/platform-browser' },
            {
              text: '适配器集成',
              collapsed: false,
              items: [
                { text: 'Viewfly', link: '/integrate/adapter-viewfly' },
                { text: 'Vue', link: '/integrate/adapter-vue' },
                { text: 'React', link: '/integrate/adapter-react' },
              ],
            },
            { text: '协作编辑', link: '/integrate/collaborate' },
          ],
        },
      ],
      '/integrate/': [
        {
          text: '集成',
          items: [
            { text: 'Viewfly 适配器', link: '/integrate/adapter-viewfly' },
            { text: 'Vue 适配器', link: '/integrate/adapter-vue' },
            { text: 'React 适配器', link: '/integrate/adapter-react' },
            { text: '协作编辑', link: '/integrate/collaborate' },
          ],
        },
      ],
      '/api/': [
        {
          text: '参考',
          items: [
            { text: '概览', link: '/api/' },
            { text: '@textbus/core', link: '/api/core' },
            { text: '@textbus/platform-browser', link: '/api/platform-browser' },
            { text: '@textbus/collaborate', link: '/api/collaborate-pkg' },
            { text: '@textbus/adapter-viewfly', link: '/api/adapter-viewfly' },
            { text: '@textbus/adapter-vue', link: '/api/adapter-vue' },
            { text: '@textbus/adapter-react', link: '/api/adapter-react' },
            { text: '@textbus/platform-node', link: '/api/platform-node' },
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
