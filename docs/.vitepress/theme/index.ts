import DefaultTheme from 'vitepress/theme'
import TextbusPlayground from './components/TextbusPlayground.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('TextbusPlayground', TextbusPlayground)
  },
}
