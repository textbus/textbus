import { I18NConfig } from '@textbus/core';

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
  plugins: {
    componentStage: {
      switchText: 'component library',
      expandOrNarrowLib: 'expand or narrow component library',
      defaultCategoryName: 'default'
    },
    contextmenu: {
      insertParagraphAfter: 'insert paragraph after',
      insertParagraphBefore: 'insert paragraph before',
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
    localBackup: {
      title: 'local backup',
      confirmBtnText: 'yes',
      cancelBtnText: 'no',
      tooltip: 'local cache detected, do you want to apply?'
    },
    outlines: {
      title: 'outline',
      switchText: 'outline'
    },
    pasteHandle: {
      title: 'source upload',
      confirmBtnText: 'ok',
      cancelBtnText: 'finish',
      uploadBtnText: 'upload',
      imageLabel: '{0} picture',
      videoLabel: '{0} video',
      audioLabel: '{0} audio',
      imagePlaceholder: 'please enter image URL',
      videoPlaceholder: 'please enter video URL',
      audioPlaceholder: 'please enter audio URL',
    },
    sourcecodeMode: {
      switchText: 'source code'
    },
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
    },
    alertComponent: {
      creator: {
        name: 'Alert'
      },
      setter: {
        title: 'Setting',
        typeLabel: 'type',
        fillLabel: 'fill',
        confirmBtnText: 'ok'
      }
    },
    baiduMapComponent: {
      creator: {
        name: 'Baidu map',
        form: {
          placeholder: 'please input address',
          searchBtnText: 'search',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      }
    },
    imageCardComponent: {
      creator: {
        name: 'Card'
      }
    },
    jumbotronComponent: {
      creator: {
        name: 'Jumbotron',
        form: {
          title: 'jumbotron setting',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel',
          minHeightLabel: 'min height',
          minHeightInputPlaceholder: 'min height',
          backgroundImageLabel: 'background image',
          backgroundImageInputPlaceholder: 'background image url',
          uploadBtnText: 'upload',
          validateErrorMessage: 'fields is required.'
        }
      },
      setter: {
        title: 'jumbotron setting',
        confirmBtnText: 'ok',
        minHeightLabel: 'min height',
        minHeightInputPlaceholder: 'min height',
        backgroundImageLabel: 'background image',
        backgroundImageInputPlaceholder: 'background image url',
        uploadBtnText: 'upload',
        validateErrorMessage: 'fields is required.'
      }
    },
    katexComponent: {
      creator: {
        name: 'Mathematical formula',
        form: {
          title: 'mathematical formula setting',
          label: 'source code',
          placeholder: 'please...',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      setter: {
        title: 'mathematical formula setting',
        confirmBtnText: 'ok',
        placeholder: 'source code'
      }
    },
    progressComponent: {
      creator: {
        name: 'Progress',
        form: {
          title: 'Progress setting',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel',
          max: {
            label: 'max value',
            placeholder: 'max value',
            validateErrorMessage: 'fields is required.'
          },
          min: {
            label: 'min value',
            placeholder: 'min value',
            validateErrorMessage: 'fields is required.'
          },
          progress: {
            label: 'progress value',
            placeholder: 'progress value',
            validateErrorMessage: 'fields is required.'
          },
          type: {
            label: 'type',
            validateErrorMessage: 'fields is required.'
          }
        }
      }
    },
    stepsComponent: {
      creator: {
        name: 'Steps'
      }
    },
    timelineComponent: {
      creator: {
        name: 'Timeline'
      }
    },
    todoListComponent: {
      creator: {
        name: 'Todolist'
      }
    },
    wordExplainComponent: {
      creator: {
        name: 'Word explain'
      },
      setter: {
        title: 'word explain setting',
        confirmBtnText: 'ok',
        widthInputPlaceholder: 'title box width',
        widthLabel: 'width'
      }
    }
  }
}
