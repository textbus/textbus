import DefaultTheme from 'vitepress/theme'
import { inBrowser } from 'vitepress'
import TextbusIoHome from './components/TextbusIoHome.vue'
import TextbusPlayground from './components/TextbusPlayground.vue'
import './custom.css'

function normalizeRoutePath(path: string): string {
  const p = path.replace(/\/$/, '') || '/'
  return p === '/en' ? '/en' : p
}

/** Wide layout flags on #VPContent — avoid `:has()` in CSS (older browsers / strict parsers). */
function syncVpLayoutClasses(routePath: string): void {
  const el = document.getElementById('VPContent')
  if (!el) {
    return
  }
  const p = normalizeRoutePath(routePath)
  const isHome = p === '/' || p === '/en'
  const isPlayground = p === '/playground' || p === '/en/playground'
  el.classList.toggle('tb-layout-home', isHome)
  el.classList.toggle('tb-layout-playground', isPlayground)
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
        // VitePress Router updates `route` before this hook runs (see `go` / `popstate`).
        requestAnimationFrame(() => syncVpLayoutClasses(router.route.path))
      }
    }
  },
}
