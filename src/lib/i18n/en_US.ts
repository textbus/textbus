import { I18NConfig } from '../i18n';

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
    toolbar: {
      audioTool: {
        tooltip: 'audio',
        view: {
          title: 'audio setting',
          addressLabel: 'URL',
          addressPlaceholder: 'audio url',
          uploadBtnText: 'upload audio',
          errorMessage: 'fields is required.',
          switchLabel: 'autoplay',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      blockBackgroundColorTool: {
        tooltip: 'block background',
        view: {
          btnText: 'ok'
        }
      },
      blockMarginTool: {
        label: 'block margin',
        tooltip: 'block margin',
        view: {
          topLabel: 'margin top',
          topPlaceholder: 'margin top',
          rightLabel: 'margin right',
          rightPlaceholder: 'margin right',
          bottomLabel: 'margin bottom',
          bottomPlaceholder: 'margin bottom',
          leftLabel: 'margin left',
          leftPlaceholder: 'margin left',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      blockPaddingTool: {
        label: 'padding',
        tooltip: 'padding',
        view: {
          topLabel: 'padding top',
          topPlaceholder: 'padding top',
          rightLabel: 'padding right',
          rightPlaceholder: 'padding right',
          bottomLabel: 'padding bottom',
          bottomPlaceholder: 'padding bottom',
          leftLabel: 'padding left',
          leftPlaceholder: 'padding left',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      blockquoteTool: {
        tooltip: 'blockquote'
      },
      boldTool: {
        tooltip: 'bold'
      },
      cleanTool: {
        tooltip: 'clean format'
      },
      codeTool: {
        tooltip: 'Code'
      },
      colorTool: {
        tooltip: 'text color',
        view: {
          btnText: 'ok'
        }
      },
      emojiTool: {
        tooltip: 'emoji'
      },
      findTool: {
        tooltip: 'find and replace',
        view: {
          findLabel: 'find',
          findPlaceholder: 'find content',
          nextBtnText: 'next',
          replaceLabel: 'replace',
          replacePlaceholder: 'replace to',
          replaceBtnText: 'replace',
          replaceAllBtnText: 'replace all'
        }
      },
      fontFamilyTool: {
        tooltip: 'font family',
        defaultFamilyText: 'inherit'
      },
      fontSizeTool: {
        tooltip: 'font size',
        defaultSizeText: 'inherit'
      },
      headingTool: {
        tooltip: 'paragraph and heading',
        h1: 'heading 1',
        h2: 'heading 2',
        h3: 'heading 3',
        h4: 'heading 4',
        h5: 'heading 5',
        h6: 'heading 6',
        div: 'div',
        paragraph: 'paragraph',
      },
      historyBackTool: {
        tooltip: 'back'
      },
      historyForwardTool: {
        tooltip: 'forward'
      },
      imageTool: {
        tooltip: 'picture',
        view: {
          title: 'picture setting',
          linkLabel: 'URL',
          linkInputPlaceholder: 'image url',
          uploadBtnText: 'upload image',
          validateErrorMessage: 'fields is required.',
          sizeSetter: {
            label: 'size',
            widthPlaceholder: 'width',
            heightPlaceholder: 'height'
          },
          maxSizeSetter: {
            label: 'max size',
            widthPlaceholder: 'width',
            heightPlaceholder: 'height'
          },
          float: {
            label: 'float',
            noFloatLabel: 'no',
            floatToLeftLabel: 'to left',
            floatToRightLabel: 'to right'
          },
          marginLabel: 'margin',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      inlineMarginTool: {
        label: 'inline margin',
        tooltip: 'inline margin',
        view: {
          topLabel: 'margin top',
          topPlaceholder: 'margin top',
          rightLabel: 'margin right',
          rightPlaceholder: 'margin right',
          bottomLabel: 'margin bottom',
          bottomPlaceholder: 'margin bottom',
          leftLabel: 'margin left',
          leftPlaceholder: 'margin left',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      inlinePaddingTool: {
        label: 'inline padding',
        tooltip: 'inline padding',
        view: {
          topLabel: 'padding top',
          topPlaceholder: 'padding top',
          rightLabel: 'padding right',
          rightPlaceholder: 'padding right',
          bottomLabel: 'padding bottom',
          bottomPlaceholder: 'padding bottom',
          leftLabel: 'padding left',
          leftPlaceholder: 'padding left',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel'
        }
      },
      insertObjectTool: {
        sourceCode: 'source code',
        lineHeight: 'line height',
        letterSpacing: 'letter spacing',
        blockBackgroundColor: 'block background color',
        emoji: 'emoji',
        audio: 'audio...',
        video: 'video...',
        subscript: 'subscript',
        superscript: 'superscript',
        code: 'Code',
        blockquote: 'blockquote',
        leftToRight: 'ltr',
        rightToLeft: 'rtl'
      },
      insertParagraphAfterTool: {
        tooltip: 'insert paragraph to after'
      },
      insertParagraphBeforeTool: {
        tooltip: 'insert paragraph to before'
      },
      italicTool: {
        tooltip: 'italic'
      },
      leftToRightTool: {
        tooltip: 'ltr'
      },
      letterSpacingTool: {
        tooltip: 'letter spacing',
        defaultValueLabel: 'inherit'
      },
      lineHeightTool: {
        tooltip: 'line height',
        defaultValueLabel: 'inherit'
      },
      linkTool: {
        tooltip: 'link',
        view: {
          linkLabel: 'link url',
          linkInputPlaceholder: 'url address',
          jumpLabel: 'target',
          jumpSelfLabel: '_self',
          jumpBlankLabel: '_blank',
          invalidMessage: 'url is invalid'
        }
      },
      olTool: {
        tooltip: 'ol'
      },
      preTool: {
        tooltip: 'pre',
      },
      rightToLeftTool: {
        tooltip: 'rtl'
      },
      strikeThrough: {
        tooltip: 'strike'
      },
      subscript: {
        tooltip: 'subscript'
      },
      superscript: {
        tooltip: 'superscript'
      },
      tableTool: {
        tooltip: 'table',
        createTable: 'create table',
        editTable: 'edit table',
        cellBorderColor: 'table cell border color',
        deleteTable: 'delete table'
      },
      tableAddTool: {
        tooltip: 'insert table',
        view: {
          confirmBtnText: 'ok',
          rowLabel: 'row count',
          rowPlaceholder: 'row count',
          columnLabel: 'column count',
          columnPlaceholder: 'column count',
          useTextBusStyleLabel: 'use TextBus style'
        }
      },
      tableEditTool: {
        tooltip: 'edit table',
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
      tableRemoveTool: {
        tooltip: 'delete table'
      },
      tdBorderColorTool: {
        tooltip: 'table cell border color',
        view: {
          confirmBtnText: 'ok'
        }
      },
      textAlignTool: {
        tooltip: 'text align',
        left: 'align left',
        right: 'align right',
        center: 'align center',
        justify: 'align justify'
      },
      textBackgroundColorTool: {
        tooltip: 'text background color',
        view: {
          confirmBtnText: 'ok'
        }
      },
      textIndentTool: {
        tooltip: 'text indent'
      },
      ulTool: {
        tooltip: 'ul'
      },
      underlineTool: {
        tooltip: 'underline'
      },
      unlinkTool: {
        tooltip: 'remove link'
      },
      verticalAlignTool: {
        tooltip: 'vertical align',
        baseline: 'baseline',
        super: 'super',
        sub: 'sub',
        top: 'top',
        middle: 'middle',
        bottom: 'bottom',
        textTop: 'text-top',
        textBottom: 'text-bottom'
      },
      videoTool: {
        tooltip: 'video',
        view: {
          title: 'video setting',
          confirmBtnText: 'ok',
          cancelBtnText: 'cancel',
          linkLabel: 'URL',
          linkInputPlaceholder: 'video url',
          uploadBtnText: 'upload',
          validateErrorMessage: 'fields is required.',
          videoWidthLabel: 'width',
          videoWidthInputPlaceholder: 'support CSS unit',
          videoHeightLabel: 'height',
          videoHeightInputPlaceholder: 'support CSS unit',
          autoplayLabel: 'autoplay'
        }
      }
    }
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
