import { I18NConfig } from '../i18n'

export const i18n_en_US: I18NConfig = {
  /** core library dependency start, no optional */
  editor: {
    noSelection: 'please select the location to insert the resource first!',
    copy: 'copy',
    paste: 'paste',
    cut: 'cut',
    selectAll: 'select all',
    insertParagraphAfter: 'insert paragraph to after',
    insertParagraphBefore: 'insert paragraph to before',
    input: {
      canNotAccessClipboard: 'can not access to the clipboard!'
    },
    noUploader: 'please add upload function to editor options!',
  },
  /** core library dependency end */
  /** optional config */
  plugins: {
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
      formatPainterTool: {
        tooltip: 'format painter'
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
        defaultLang: 'source code'
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
          useTextbusStyleLabel: 'use Textbus style'
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
      },
      componentsTool: {
        tooltip: 'component library',
      },
    },
    linkJump: {
      accessLink: 'open'
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
    }
  },
  components: {
    tableComponent: {
      addColumnToLeft: 'add column to left',
      addColumnToRight: 'add column to right',
      insertRowBefore: 'insert row to before',
      insertRowAfter: 'insert row to after',
      deleteColumns: 'delete columns',
      deleteRows: 'delete rows',
      mergeCells: 'merge cells',
      splitCells: 'split cells',
      contextMenuLabel: 'table',
      contextMenuRemoveTable: 'remove table'
    },
    preComponent: {
      defaultLang: 'other',
      contextMenuLabel: 'switch language',
      changeTheme: 'change theme'
    },
    alertComponent: {
      creator: {
        name: 'Alert'
      },
      contextMenu: {
        fill: 'fill alert',
        noFill: 'cancel fill alert',
        type: 'select alert style',
      }
    },
    imageCardComponent: {
      creator: {
        name: 'Card'
      },
      setting: {
        title: 'card setting',
        srcLabel: 'url',
        srcPlaceholder: 'please enter the picture url',
        heightLabel: 'image height',
        heightPlaceholder: 'please enter the picture height',
        confirmBtnText: 'ok',
        cancelBtnText: 'cancel',
      }
    },
    jumbotronComponent: {
      settingBtn: 'setting',
      creator: {
        name: 'Jumbotron'
      },
      setting: {
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
      }
    },
    katexComponent: {
      creator: {
        name: 'Mathematical formula'
      },
      setter: {
        title: 'mathematical formula setting',
        label: 'source code',
        placeholder: 'please...',
        confirmBtnText: 'ok',
        cancelBtnText: 'cancel'
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
        cancelBtnText: 'cancel',
        widthInputPlaceholder: 'title box width',
        widthLabel: 'width'
      }
    }
  }
}
