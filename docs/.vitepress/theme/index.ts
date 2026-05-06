import DefaultTheme from 'vitepress/theme'
import { inBrowser } from 'vitepress'
import TextbusIoHome from './components/TextbusIoHome.vue'
import TextbusPlayground from './components/TextbusPlayground.vue'
import './custom.css'

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
  const el = document.getElementById('VPContent')
  if (!el) {
    return
  }
  const p = logicalRoutePath(routePath)
  const isHome = p === '/' || p === '/en'
  el.classList.toggle('tb-layout-home', isHome)
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    app.component('TextbusIoHome', TextbusIoHome)
    app.component('TextbusPlayground', TextbusPlayground)

    if (inBrowser) {
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
