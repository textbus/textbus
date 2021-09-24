import { I18NConfig } from './i18n';

export const i18n_zh_CN: I18NConfig = {
  /** 核心库依赖，不可缺少 */
  editor: {
    noUploader: '请在初始化时配置 uploader 方法！',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    selectAll: '全选',
    input: {
      noAccessClipboard: '无法访问剪切板！'
    },
    controlPanel: {
      cancelFixed: '取消固定',
      fixed: '固定'
    }
  },
  /** 核心库依赖结束 */
  /** 以下配置，可根据自己的组件及插件配置添加或删除 */
  plugins: {},
  components: {}
}
