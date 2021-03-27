import { I18NConfig } from '../i18n';

export const i18n_en_US: I18NConfig = {
  // core library dependency, no optional
  editor: {
    noSelection: 'please select the location to insert the resource first!',
    insertParagraphAfter: 'insert paragraph after',
    insertParagraphBefore: 'insert paragraph before',
    copy: 'copy',
    paste: 'paste',
    cut: 'cut',
    selectAll: 'select all'
  },
  plugins: {
    // core library dependency, no optional
    controlPanel: {
      cancelFixed: 'cancel fixed',
      fixed: 'fixec'
    },
    // core library dependency, no optional
    pasteHandle: {
      title: 'source upload',
      confirmBtnText: 'confirm',
      cancelBtnText: 'finish',
      uploadBtnText: 'upload',
      imageLabel: '{0} picture',
      videoLabel: '{0} video',
      audioLabel: '{0} audio',
      imagePlaceholder: 'please enter image URL',
      videoPlaceholder: 'please enter video URL',
      audioPlaceholder: 'please enter audio URL',
    },
    componentStage: {
      switchText: 'component library',
      expandOrNarrowLib: 'expand or narrow component library',
      defaultCategoryName: 'default'
    },
    device: {
      title: 'switch device width',
      unknownDeviceText: 'unknown device'
    },
    fullScreen: {
      switchFullScreen: 'switch full screen'
    },
    linkJump: {
      accessLink: 'open'
    },
    outlines: {
      title: 'outline',
      switchText: 'outline'
    },
    sourcecodeMode: {
      switchText: 'source code'
    },
    toolbar: {}
  },
  components: {
    tableComponent: {
      addColumnToLeft: 'add column to left',
      addColumnToRight: 'add column to right',
      insertRowBefore: 'insert row to before',
      insertRowAfter: 'insert row to after',
      deleteLeftColumn: 'delete left column',
      deleteRightColumn: 'delete right column',
      deletePrevRow: 'delete previous row',
      deleteNextRow: 'delete next row',
      mergeCells: 'merge cells',
      splitCells: 'split cells'
    }
  }
}
