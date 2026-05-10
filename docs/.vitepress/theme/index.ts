import DefaultTheme from 'vitepress/theme'
import { defineClientComponent, inBrowser } from 'vitepress'
import TextbusPlayground from './components/TextbusPlayground.vue'
import './custom.css'

/** 首页编辑器依赖浏览器 API，避免被打进 SSR 包。 */
const TextbusIoHome = defineClientComponent(() => import('./components/TextbusIoHome.vue'))

/** `cleanUrls: false` 时为 `*.html`；去掉尾部 `/` 与 `.html` 再比较逻辑路径。 */
function logicalRoutePath(path: string): string {
  let p = path.replace(/\/$/, '') || '/'
  p = p.replace(/\.html$/i, '')
  if (p.endsWith('/index')) {
    p = p.slice(0, -6) || '/'
  }
  if (p === '/index') {
    p = '/'
  }
  return p
}

/** Wide layout flags on #VPContent — avoid `:has()` in CSS (older browsers / strict parsers). */
function syncVpLayoutClasses(routePath: string): void {
  const p = logicalRoutePath(routePath)
  const isHome = p === '/' || p === '/en'
  /** 供 CSS 选择「首页路由」(layout 为 TextbusIoHome 时 VPNavBar 无官方 `home` class)。 */
  document.documentElement.classList.toggle('tb-layout-home', isHome)
  const el = document.getElementById('VPContent')
  if (!el) {
    return
  }
  el.classList.toggle('tb-layout-home', isHome)
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('TextbusIoHome', TextbusIoHome)
    app.component('TextbusPlayground', TextbusPlayground)

    if (inBrowser) {
      queueMicrotask(() => syncVpLayoutClasses(router.route.path))
      const prev = router.onAfterRouteChange
      router.onAfterRouteChange = async (to) => {
        await prev?.(to)
        const path = router.route.path
        // `onAfterRouteChange` 在首次 `router.go()` 里早于 `app.mount()`，`#VPContent` 尚不存在；推迟到宏任务再同步。
        setTimeout(() => syncVpLayoutClasses(path), 0)
      }
    }
  },
}
