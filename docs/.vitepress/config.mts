import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Textbus',
  description: '组件化、跨平台的富文本框架',
  lang: 'zh-CN',

  themeConfig: {
    logo: { src: '/logo.png', alt: 'Textbus' },
    siteTitle: false,

    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: '集成', link: '/integrate/adapter-viewfly' },
      { text: 'API', link: '/api/' },
      { text: '在线演示', link: 'https://textbus.io/playground' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
          ],
        },
        {
          text: '指南',
          items: [
            { text: '核心概念', link: '/guide/concepts' },
            { text: '编辑器与模块', link: '/guide/editor-and-modules' },
            { text: '选区、命令与查询', link: '/guide/selection-commands-query' },
            { text: '历史记录与键盘', link: '/guide/history-keyboard' },
            { text: '浏览器平台层', link: '/guide/platform-browser' },
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
