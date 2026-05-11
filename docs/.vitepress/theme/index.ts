import { watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { inBrowser } from 'vitepress'
import Layout from './Layout.vue'
import TextbusCollabPlayground from './components/TextbusCollabPlayground.vue'
import TextbusIoHome from './components/TextbusIoHome.vue'
import TextbusPlayground from './components/TextbusPlayground.vue'
import './custom.css'

/** 与 `layout: TextbusIoHome` 的首页 markdown 路径一致（勿用 `router.route.path`，避免 base / `.html` / 尾缀差异）。 */
function syncTbLayoutHomeFromRelativePath(relativePath: string): void {
  const isHome = relativePath === 'index.md' || relativePath === 'en/index.md'
  document.documentElement.classList.toggle('tb-layout-home', isHome)
  document.getElementById('VPContent')?.classList.toggle('tb-layout-home', isHome)
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    app.component('TextbusCollabPlayground', TextbusCollabPlayground)
    app.component('TextbusIoHome', TextbusIoHome)
    app.component('TextbusPlayground', TextbusPlayground)

    if (inBrowser) {
      watch(
        () => router.route.data.relativePath,
        rel => syncTbLayoutHomeFromRelativePath(rel),
        { flush: 'post', immediate: true },
      )
    }
  },
}
