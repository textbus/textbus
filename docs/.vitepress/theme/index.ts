import DefaultTheme from 'vitepress/theme'
import TextbusIoHome from './components/TextbusIoHome.vue'
import TextbusPlayground from './components/TextbusPlayground.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TextbusIoHome', TextbusIoHome)
    app.component('TextbusPlayground', TextbusPlayground)
  },
}
