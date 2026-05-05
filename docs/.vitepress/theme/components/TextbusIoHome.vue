<script setup lang="ts">
import type { Member } from '@textbus/xnote'
import { useData, withBase } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const { localeIndex } = useData()
const isEn = computed(() => localeIndex.value === 'en')

const homeCopy = computed(() =>
  isEn.value
    ? {
        heroTitle: '5.0 Released',
        heroSlogan: 'High-performance rich text with a master–slave architecture',
        heroDesc: 'Native rendering with Viewfly, React, and Vue',
        cta: 'Get started',
        feat1h: 'Performance',
        feat1p:
          'Smooth editing at scale — very large documents, tens of thousands of DOM nodes, and tens of thousands of blocks.',
        feat2h: 'Type safety',
        feat2p: 'Full TypeScript support for complex editor features.',
        feat3h: 'Collaboration',
        feat3p: 'Build multiplayer editors without reinventing sync.',
        feat4h: 'Extensibility',
        feat4p: 'First-class integration with Viewfly, Vue, and React.',
      }
    : {
        heroTitle: '5.0 正式发布',
        heroSlogan: '支持主从结构、高性能的富文本库',
        heroDesc: '原生支持 Viewfly、React、Vue 渲染富文本',
        cta: '快速上手',
        feat1h: '超强性能',
        feat1p:
          '支持 <strong>1000 万字</strong>、<strong>25 万 DOM 节点</strong>、<strong>5 万段落</strong>无卡顿编辑',
        feat2h: '类型安全',
        feat2p: '完整的 TypeScript 支持，帮助你更快完成复杂的富文本开发',
        feat3h: '支持协作',
        feat3p: '支持在线协作，无成本开发多人在线编辑器',
        feat4h: '易扩展',
        feat4p: '全面拥抱前端框架，无缝接入 Viewfly、Vue 和 React',
      },
)

const gettingStartedHref = computed(() =>
  withBase(isEn.value ? '/en/guide/getting-started' : '/guide/getting-started'),
)

const editorBgImage = computed(
  () =>
    `linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 42%, transparent 78%), url(${JSON.stringify(withBase('/bg1.jpg'))})`,
)

/** 仅首页需要：用 link 注入，卸载时移除，避免 XNote 全局 UnoCSS 污染整站深色主题 */
const injectedStylesheets: HTMLLinkElement[] = []

function injectStylesheet(href: string): void {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  /** Keep Vite-resolved URLs as-is — they already account for `base`; do not run `withBase` here. */
  link.href = href
  link.dataset.tbIoHome = '1'
  document.head.appendChild(link)
  injectedStylesheets.push(link)
}

function removeInjectedStylesheets(): void {
  for (const el of injectedStylesheets) {
    el.remove()
  }
  injectedStylesheets.length = 0
}

const toolbarHost = ref<HTMLElement | null>(null)
const contentHost = ref<HTMLElement | null>(null)
const bgLoaded = ref(false)

let cancelled = false
let editor: { destroy: () => void } | null = null

const firstNameText = '王、李、张、刘、陈、杨、黄、赵、周、吴、徐、孙、马、胡、朱、郭、何、罗、高、林'.replace(/、/g, '')
const lastNameText =
    '本义既为女子所生子嗣则同一女子所生子嗣组成的亲族也可以称为姓以表示其同出于一个女性始祖的这种特殊的亲属关系这是姓的另一引申义此种亲族组织强调女性始祖则当如许多学者所推拟的其最初必形成于母系氏族社会中即夫从妻居子女属于母族世系以母方计对于这种具有血缘关系的亲属组织的名称杨希枚先生主张称为姓族典籍所记姬姓姜姓嬴姓最初应皆属母系姓族姬姜则是此种母系姓族之名号进入父系氏族社会后妻从夫居子女不再属母族而归于父族世系以父方计所以母系姓族遂转为父系姓族此后父系姓族仍然使用着母系姓族的名号其四姓在东周文献中有时是指姓族之名号如国语周语下言赐姓曰姜之姓即应理解为所赐姓族之名号即姜又如左传哀公五月昭夫人孟子卒昭公娶于吴故不书姓很明显姓在这里是指吴女所属姓族之名号即姬所谓姓族之姓与作姓族名号讲的姓是一实一名属于两种概念范畴所以会发生此种混同当如杨希枚先生所言是由于名代表实积久而以实为名于是产生姬姜之类姓之名号就是姓的概念司马迁在史记中常言姓某氏没能区别古代姓与氏之不同但他所说的姓意思即是指姓族之名号妘黄帝住姬水之滨以姬为姓司马迁在史记五帝本纪中说黄帝二十五子其得姓者十四人三语中胥臣解释说黄帝之子二十五宗其得姓者十四人为十二姓姬酉祁己滕箴任荀僖姞儇衣是也惟青阳与夷鼓同己姓后来的五帝少昊颛顼喾尧舜以及夏禹商族的祖先契周族的祖先农神后稷秦族的祖先伯益等都是黄帝的后代后稷承继姬姓他的后代建立了周朝周初周天子姬发大封诸侯时其中姬姓国个姬姓位于百家姓第位由姬姓演支出个姓占百家姓总姓姓的再演化出来的姓氏更是数不胜数了炎帝居姜水之旁以姜为姓姜姓还是今天中国的许多姓氏如吕姓谢姓齐姓高姓卢姓崔姓等的重要起源之一姜姓在当今以人口排名的中国百家姓氏中居于第位妘起源于帝喾高辛氏嬴起源于少昊金天氏；姚妫同源都是起源于帝舜；姒起源于大禹此外部落首领之子亦可得姓黄帝有二十五子得姓者十四人为姬酉祁己滕任荀葴僖姞儇依十二姓其中有四人分属二姓祝融之后为己董彭秃妘曹斟芈等八姓史称祝融八姓'

const DEMO_HTML_ZH =
    '<div dir="auto" data-component="RootComponent" style="padding-bottom:40px" class="xnote-root"><div data-placeholder="" class="xnote-content"><div data-component="ParagraphComponent" class="xnote-paragraph"><div><span style="font-size:18px">Hi，小伙伴们，欢迎你使用&nbsp;<strong>Textbus</strong>&nbsp;富文本框架！</span></div></div><blockquote data-component="BlockquoteComponent" class="xnote-blockquote"><div><div data-component="ParagraphComponent" class="xnote-paragraph"><div>你正在查看的是&nbsp;<a href="https://github.com/textbus/xnote" target="_blanK">XNote</a>&nbsp;的演示效果，如果你需要一个开箱即用的富文本编辑器，你可以直接使用它。如果你需要完全自定义一个全新的富文本编辑器，你可以直接查看 Textbus 的开发者文档。</div></div></div></blockquote><div data-component="ParagraphComponent" class="xnote-paragraph"><div>XNote 是 Textbus 官方开发的富文本编辑器，提供了大多数常见的功能。如：</div></div><ul data-component="ListComponent" data-reorder="true" style="margin-left:0px" class="xnote-list"><li><div class="xnote-list-type"><span class="xnote-order-btn">•</span></div><div class="xnote-list-content">常见格式：<strong>加粗</strong>、<em>斜体</em>、<u>下划线</u>、<del>中划线</del>、<span style="font-family:SimSun, STSong">字体</span>、<span style="color:#617fff">文字颜色</span>、<sup>上标</sup>、<sub>下标</sub>等。</div></li></ul><ul data-component="ListComponent" data-reorder="true" style="margin-left:0px" class="xnote-list"><li><div class="xnote-list-type"><span class="xnote-order-btn">•</span></div><div class="xnote-list-content">代码块、表格、视频、图片、高亮块、对齐方式等。</div></li></ul><ul data-component="ListComponent" data-reorder="true" style="margin-left:0px" class="xnote-list"><li><div class="xnote-list-type"><span class="xnote-order-btn">•</span></div><div class="xnote-list-content">有序列表、无序列表、待办事项、引用块、数学公式等。</div></li></ul><div data-component="ParagraphComponent" class="xnote-paragraph"><div>XNote 还支持 Markdown 语法的实时转换，如：当你输入 “#” 并接着键入“空格” 时，XNote 将转换为一级标题。当你提供了组织信息（Organization）时，XNote 还支持通过 “@” 组织<div data-info="%7B%22id%22%3A%22xxx%22%2C%22name%22%3A%22Textbus%22%2C%22groupName%22%3A%22%E9%83%A8%E9%97%A8-%E6%9D%8E%E8%83%9C%22%2C%22groupId%22%3A%22xxx%22%2C%22avatar%22%3A%22%22%2C%22color%22%3A%22%2391205a%22%7D" data-component="AtComponent" class="xnote-at xnote-at-complete"><span>@</span>Textbus</div>成员。</div></div><div data-component="ParagraphComponent" class="xnote-paragraph"><div>我们会不定时的增加新的功能，欢迎你持续关注！</div></div></div></div>'

/** 英文首页演示正文（与中文版结构类似） */
const DEMO_HTML_EN =
  '<div dir="auto" data-component="RootComponent" style="padding-bottom:40px" class="xnote-root"><div data-placeholder="" class="xnote-content"><div data-component="ParagraphComponent" class="xnote-paragraph"><div><span style="font-size:18px">Hi! Welcome to the <strong>Textbus</strong> rich text framework.</span></div></div><blockquote data-component="BlockquoteComponent" class="xnote-blockquote"><div><div data-component="ParagraphComponent" class="xnote-paragraph"><div>You are viewing <a href="https://github.com/textbus/xnote" target="_blank">XNote</a>, the official editor demo. Use XNote directly if you want a full editor product; read the Textbus docs if you need a fully custom editor.</div></div></div></blockquote><div data-component="ParagraphComponent" class="xnote-paragraph"><div>XNote covers common formatting, media, tables, code blocks, tasks, math, and more — plus Markdown-style shortcuts as you type. With an organization provider, mention teammates with <div data-info="%7B%22id%22%3A%22xxx%22%2C%22name%22%3A%22Textbus%22%2C%22groupName%22%3A%22Dept-Li%22%2C%22groupId%22%3A%22xxx%22%2C%22avatar%22%3A%22%22%2C%22color%22%3A%22%2391205a%22%7D" data-component="AtComponent" class="xnote-at xnote-at-complete"><span>@</span>Textbus</div>.</div></div><div data-component="ParagraphComponent" class="xnote-paragraph"><div>We ship improvements continuously — thanks for trying Textbus!</div></div></div></div>'

function sleep(delay: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

function createUserName(): string {
  const i = Math.floor(Math.random() * firstNameText.length)
  const firstName = firstNameText.substring(i, i + 1)
  const j = Math.floor(Math.random() * lastNameText.length)
  const len = 1 + Math.floor(Math.random() * 2)
  const lastName = lastNameText.substring(j, Math.min(j + len, lastNameText.length))
  return firstName + lastName
}

function createColor(): string {
  const fn = function () {
    const s = Math.floor(Math.random() * 255).toString(16)
    return s.length === 2 ? s : '0' + s
  }
  return `#${fn()}${fn()}${fn()}`
}

/** 背景图：`docs/public/bg1.jpg`（可由 https://textbus.io/6f83325d799b40bccfb9.jpg 更新） */
function preloadBackground(): void {
  const image = new Image()
  image.onload = () => {
    bgLoaded.value = true
  }
  image.onerror = () => {
    bgLoaded.value = true
  }
  image.src = withBase('/bg1.jpg')
}

onMounted(() => {
  preloadBackground()
  void bootstrap().catch(err => {
    console.error('[TextbusIoHome] bootstrap failed', err)
  })
})

onBeforeUnmount(() => {
  cancelled = true
  editor?.destroy()
  editor = null
  removeInjectedStylesheets()
})

async function bootstrap(): Promise<void> {
  await nextTick()
  const toolbarEl = toolbarHost.value
  const contentEl = contentHost.value
  if (!toolbarEl || !contentEl || cancelled) {
    return
  }

  await import('reflect-metadata')

  const [{ default: iconsCssHref }, { default: xnoteCssHref }] = await Promise.all([
    import('bootstrap-icons/font/bootstrap-icons.css?url'),
    import('@textbus/xnote/style.css?url'),
  ])
  injectStylesheet(iconsCssHref)
  injectStylesheet(xnoteCssHref)

  if (cancelled) {
    removeInjectedStylesheets()
    return
  }

  const { Editor, StaticToolbarPlugin, Organization } = await import('@textbus/xnote')

  if (cancelled) {
    removeInjectedStylesheets()
    return
  }

  class Http extends Organization {
    async getMembers(name: string): Promise<Member[]> {
      await sleep(100)
      const len = Math.floor(20 / Math.max(name.length, 1) + 1)
      const dept = isEn.value ? 'Dept-' : '部门-'
      const arr: Member[] = Array.from({length: len}).map(() => ({
        id: 'xxx',
        name: name + createUserName(),
        groupName: dept + createUserName(),
        groupId: 'xxx',
        avatar: '',
        color: createColor(),
      }))
      if (name.length) {
        arr.unshift({
          id: 'xxx',
          name,
          groupName: dept + createUserName(),
          groupId: 'xxx',
          avatar: '',
          color: createColor(),
        })
      }
      return arr
    }

    atMember(): void {
      //
    }
  }

  const instance = new Editor({
    providers: [
      {
        provide: Organization,
        useValue: new Http(),
      },
    ],
    content: localeIndex.value === 'en' ? DEMO_HTML_EN : DEMO_HTML_ZH,
    plugins: [
      new StaticToolbarPlugin({
        host: toolbarEl,
        theme: 'dark',
      }),
    ],
  })

  await instance.mount(contentEl)
  if (cancelled) {
    instance.destroy()
    return
  }
  editor = instance
}
</script>

<template>
  <div class="tb-io-home">
    <div
      class="static-editor"
      :class="{ 'bg-loaded': bgLoaded }"
      :style="{ '--tb-editor-bg-image': editorBgImage }"
    >
      <div class="banner ui-container-fluid">
        <div class="ui-container content">
          <h1 class="name">{{ homeCopy.heroTitle }}</h1>
          <div class="slogan">{{ homeCopy.heroSlogan }}</div>
          <p class="desc">{{ homeCopy.heroDesc }}</p>
          <p>
            <a class="btn btn-quick-start" :href="gettingStartedHref" role="button">
              {{ homeCopy.cta }}
              <span class="tb-io-home__btn-arrow" aria-hidden="true">→</span>
            </a>
          </p>
        </div>
      </div>

      <div class="editor">
        <div ref="toolbarHost" class="editor-toolbar"/>
        <div ref="contentHost" class="editor-content"/>
      </div>
    </div>

    <div class="desc">
      <div class="ui-container">
        <div class="ui-row group">
          <div class="ui-col-sm-12 ui-col-lg-6">
            <div class="icon">
              <i class="bi bi-lightning-charge-fill"/>
              <h3>{{ homeCopy.feat1h }}</h3>
            </div>
            <p v-html="homeCopy.feat1p" />
          </div>
          <div class="ui-col-sm-12 ui-col-lg-6">
            <div class="icon">
              <i class="bi bi-shield-fill-check"/>
              <h3>{{ homeCopy.feat2h }}</h3>
            </div>
            <p>{{ homeCopy.feat2p }}</p>
          </div>
          <div class="ui-col-sm-12 ui-col-lg-6">
            <div class="icon">
              <i class="bi bi-brightness-high-fill"/>
              <h3>{{ homeCopy.feat3h }}</h3>
            </div>
            <p>{{ homeCopy.feat3p }}</p>
          </div>
          <div class="ui-col-sm-12 ui-col-lg-6">
            <div class="icon">
              <i class="bi bi-cursor-fill"/>
              <h3>{{ homeCopy.feat4h }}</h3>
            </div>
            <p>{{ homeCopy.feat4p }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tb-io-home {
  --tb-io-container-pad: 15px;
  --tb-io-screen-sm: 768px;
  --tb-io-screen-md: 992px;
  --tb-io-screen-lg: 1200px;
  --tb-io-grid-columns: 24;
}

/* --- textbus.io home.scoped.scss: .static-editor --- */
.static-editor {
  margin-top: -60px;
  padding: 90px 0 40px;
  position: relative;
}

.static-editor::before {
  opacity: 0;
  transition: opacity 2s;
  content: '';
  position: absolute;
  inset: 0;
  background-color: #fff;
  /* 底图为 docs/public/bg1.jpg；叠层由 --tb-editor-bg-image（withBase）注入 */
  background-image: var(--tb-editor-bg-image);
  background-position: center bottom;
  background-repeat: no-repeat;
  background-size: cover;
}

.static-editor.bg-loaded::before {
  opacity: 1;
}

/* --- textbus.io banner.scoped.scss --- */
.banner {
  padding-top: 40px;
  padding-bottom: 80px;
  background-size: 200%;
  text-align: center;
  overflow: hidden;
  position: relative;
}

.name {
  font-size: 3.6em;
  margin: 0.5em auto 0.5em;
  /* 顶区底图为浅色，固定深字以保证对比度（不继承整站深色下的浅色字） */
  color: #1a1a1a;
}

.slogan {
  font-size: 40px;
  font-weight: 300;
  line-height: 1;
  color: #1a1a1a;
}

.banner .desc {
  margin-bottom: 40px;
  color: #333;
  font-size: 20px;
}

.btn {
  padding: 10px;
  border: none;
  color: #fff;
  text-decoration: none;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 140px;
  border-radius: 20px;
  font-size: 17px;
}

.tb-io-home__btn-arrow {
  margin-left: 0.2em;
}

.btn-quick-start {
  background-color: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text);
}

.btn-quick-start:hover {
  background-color: var(--vp-button-brand-hover-bg);
  color: var(--vp-button-brand-hover-text);
}

.content {
  position: relative;
  z-index: 1;
}

/* --- textbus.io _container.scss --- */
.ui-container-fluid {
  padding-left: var(--tb-io-container-pad);
  padding-right: var(--tb-io-container-pad);
}

.ui-container {
  display: block;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--tb-io-container-pad);
  padding-right: var(--tb-io-container-pad);
  max-width: 100%;
}

@media (min-width: 768px) {
  .ui-container {
    width: 768px;
  }
}

@media (min-width: 992px) {
  .ui-container {
    width: 992px;
  }
}

@media (min-width: 1200px) {
  .ui-container {
    width: 1200px;
  }
}

/* --- textbus.io _grid.scss (12/24 & 6/24 常用列) --- */
.ui-row {
  margin-left: calc(-1 * var(--tb-io-container-pad));
  margin-right: calc(-1 * var(--tb-io-container-pad));
  display: flow-root;
}

.ui-row::after {
  content: '';
  display: table;
  clear: both;
}

[class^='ui-col-'] {
  min-height: 1px;
  padding-left: var(--tb-io-container-pad);
  padding-right: var(--tb-io-container-pad);
  box-sizing: border-box;
  width: 100%;
  float: left;
}

@media (min-width: 768px) {
  .ui-col-sm-12 {
    width: 50%;
  }
}

@media (min-width: 1200px) {
  .ui-col-lg-6.ui-col-sm-12 {
    width: 25%;
  }
}

/* --- textbus.io home.scoped.scss: .editor --- */
.editor {
  border-radius: 5px;
  padding: 0;
  max-width: 880px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.editor-toolbar {
  position: relative;
  height: 40px;
  z-index: 10;
  border-radius: 6px 6px 0 0;
}

.editor-toolbar :deep(.toolbar) {
  height: 40px;
}

.editor-content {
  padding: 15px 20px;
  overflow-y: auto;
  overflow-x: hidden;
  height: 320px;
  border: 1px solid #333;
  border-radius: 0 0 6px 6px;
  /* 固定为旧站白底编辑区；勿写 --vp-* / color-scheme，避免影响文档站主题变量 */
  background-color: #fff;
  color: #333;
}

:global(.dark) .editor-content {
  background-color: #fff;
  color: #333;
}

.editor-content :deep(.xnote-root),
.editor-content :deep(.xnote-content) {
  color: #333;
}

.editor-content :deep(a) {
  color: #0969da;
}

.editor-content :deep(a:hover) {
  color: #0550ae;
}

/* --- textbus.io home.scoped.scss: .desc --- */
.desc {
  padding-top: 1em;
  padding-bottom: 1em;
}

.desc h3 {
  margin: 0;
  color: var(--vp-c-text-1);
}

.desc p {
  line-height: 1.618em;
  color: var(--vp-c-text-2);
}

.desc .icon {
  display: flex;
  align-items: center;
}

.desc .icon i {
  font-size: 40px;
  margin-right: 0.5em;
  color: var(--vp-c-text-2);
  opacity: 0.9;
}

.desc .group > div {
  padding: 20px 30px;
}

.desc .group > div:last-child {
  border-right: 0;
}
</style>
