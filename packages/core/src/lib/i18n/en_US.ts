import { I18NConfig } from './i18n';

export const i18n_en_US: I18NConfig = {
  /** core library dependency start, no optional */
  editor: {
    noSelection: 'please select the location to insert the resource first!',
    copy: 'copy',
    paste: 'paste',
    cut: 'cut',
    selectAll: 'select all',
    input: {
      noAccessClipboard: 'no access to the clipboard!'
    },
    controlPanel: {
      cancelFixed: 'cancel fixed',
      fixed: 'fixed'
    }
  },
  /** core library dependency end */
  /** optional config */
  plugins: {},
  components: {}
}
