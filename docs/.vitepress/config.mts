import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import type { HeadConfig } from 'vitepress'

const GA_ID = 'G-YWJ01PL356'

/** 全站统计（含英文文档） */
const gtagHead: HeadConfig[] = [
  ['script', { async: '', src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` }],
  [
    'script',
    {},
    `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
  ],
]

const zhSiteKeywords =
  'Textbus, 富文本编辑器, 协同文档, 多人协作, 富文本框架, 富文本组件, wysiwyg, rich text editor, 所见即所得富文本编辑器'

const zhSiteDescription =
  'Textbus 是一个支持多人在线协同编辑、组件化、数据驱动的富文本开发框架，同时也可以作为一个开箱即用的富文本编辑器，拥有非常好的扩展性和可定制性，是构建复杂富文本的不二之选！'

/** 中文首页 SEO（仅中文版路由注入） */
const zhDocHead: HeadConfig[] = [
  ['meta', { name: 'keywords', content: zhSiteKeywords }],
  ['meta', { name: 'description', content: zhSiteDescription }],
]

const enSiteKeywords =
  'Textbus, rich text editor, collaborative editing, WYSIWYG, rich text framework, rich text components, wysiwyg'

const enSiteDescription =
  'Textbus is a component-based, data-driven rich text framework with real-time collaboration. Use it as a library or as an editor shell—highly extensible for complex rich text.'

const enDocHead: HeadConfig[] = [
  ['meta', { name: 'keywords', content: enSiteKeywords }],
  ['meta', { name: 'description', content: enSiteDescription }],
]

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const viteShared = {
  resolve: {
    alias: {
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
  /** Listen on all interfaces so `localhost` (IPv4/IPv6) reliably hits preview; avoids “page loads but assets/CSS mis-match” when only `127.0.0.1` is bound. */
  preview: {
    host: true,
    port: 5180,
  },
} as const

const socialLinks = [{ icon: 'github', link: 'https://github.com/textbus/textbus' }] as const

const sidebarZh = {
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
}

const sidebarEn = {
  '/en/guide/': [
    {
      text: 'Getting started',
      items: [
        { text: 'Introduction', link: '/en/guide/introduction' },
        { text: 'Getting started', link: '/en/guide/getting-started' },
      ],
    },
    {
      text: 'Basics',
      items: [
        { text: 'Component basics', link: '/en/guide/component-basics' },
        { text: 'Text styles', link: '/en/guide/text-styles' },
        { text: 'Block styles', link: '/en/guide/block-styles' },
        { text: 'Selection', link: '/en/guide/selection' },
        { text: 'Query & operations', link: '/en/guide/operations-and-query' },
        { text: 'History', link: '/en/guide/history' },
        { text: 'Shortcuts & grammar', link: '/en/guide/shortcuts-and-grammar' },
        { text: 'Component events & lifecycle', link: '/en/guide/component-events-and-lifecycle' },
        { text: 'Document parsing & compatibility', link: '/en/guide/document-parse-compat' },
      ],
    },
    {
      text: 'Concepts & advanced',
      items: [
        { text: 'Concepts', link: '/en/guide/concepts' },
        { text: 'Slot', link: '/en/guide/slot' },
        { text: 'Advanced components', link: '/en/guide/component-advanced' },
        {
          text: 'Adapters',
          collapsed: false,
          items: [
            { text: 'Viewfly', link: '/en/guide/adapter-viewfly' },
            { text: 'Vue', link: '/en/guide/adapter-vue' },
            { text: 'React', link: '/en/guide/adapter-react' },
          ],
        },
        { text: 'Adapter & DOM query', link: '/en/guide/adapter' },
        { text: 'Collaboration', link: '/en/guide/collaborate' },
        { text: 'Modules & extensions', link: '/en/guide/editor-and-modules' },
        { text: 'Browser module', link: '/en/guide/platform-browser' },
      ],
    },
  ],
}

const searchLocales = {
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
  en: {
    translations: {
      button: {
        buttonText: 'Search',
        buttonAriaLabel: 'Search docs',
      },
      modal: {
        displayDetails: 'Show detailed list',
        resetButtonTitle: 'Clear query',
        backButtonTitle: 'Close search',
        noResultsText: 'No results found',
        footer: {
          selectText: 'Open',
          selectKeyAriaLabel: 'Enter',
          navigateText: 'Navigate',
          navigateUpKeyAriaLabel: 'Up arrow',
          navigateDownKeyAriaLabel: 'Down arrow',
          closeText: 'Close',
          closeKeyAriaLabel: 'Escape',
        },
      },
    },
  },
} as const

export default defineConfig({
  /** `false`：构建产物与站内链接使用 `.html` 后缀（如 `/guide/introduction.html`）；`true` 则为无后缀的“清爽”URL。 */
  cleanUrls: false,
  vite: viteShared,

  head: [
    ...gtagHead,
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/textbus-icon.svg' }],
  ],

  /** Local search plugin initializes only when `provider` exists on shared themeConfig; i18n strings live in `options.locales`. */
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          ...searchLocales,
        },
      },
    },
  },

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Textbus 富文本编辑器',
      description: zhSiteDescription,
      head: [...zhDocHead],
      themeConfig: {
        logo: { src: '/textbus-logo.svg', alt: 'Textbus' },
        siteTitle: false,
        nav: [
          { text: '指南', link: '/guide/introduction' },
          { text: '在线协作', link: '/playground' },
        ],
        sidebar: sidebarZh,
        socialLinks: [...socialLinks],
        outline: { label: '本页目录' },
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        skipToContentLabel: '跳到正文',
        langMenuLabel: '切换语言',
        docFooter: { prev: '上一页', next: '下一页' },
        lastUpdated: { text: '更新于' },
        footer: {
          message: '基于 MIT 许可发布',
          copyright: 'Copyright © Textbus',
        },
      },
    },

    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Textbus',
      description: enSiteDescription,
      head: [...enDocHead],
      themeConfig: {
        logo: { src: '/textbus-logo.svg', alt: 'Textbus' },
        siteTitle: false,
        nav: [
          { text: 'Guide', link: '/en/guide/introduction' },
          { text: 'Playground', link: '/en/playground' },
        ],
        sidebar: sidebarEn,
        socialLinks: [...socialLinks],
        outline: { label: 'On this page' },
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        skipToContentLabel: 'Skip to content',
        langMenuLabel: 'Change language',
        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdated: { text: 'Updated at' },
        footer: {
          message: 'MIT Licensed',
          copyright: 'Copyright © Textbus',
        },
      },
    },
  },
})
