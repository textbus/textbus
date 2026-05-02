import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Textbus',
  description: '组件化、跨平台的富文本框架',
  lang: 'zh-CN',

  themeConfig: {
    logo: { src: '/logo.png', alt: 'Textbus' },
    siteTitle: false,

    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: '在线演示', link: 'https://textbus.io/playground' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [{ text: '快速开始', link: '/guide/getting-started' }],
        },
      ],
      '/api/': [
        {
          text: '参考',
          items: [{ text: '概览', link: '/api/' }],
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
