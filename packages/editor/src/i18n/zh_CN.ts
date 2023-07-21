import { I18NConfig } from '../i18n'

export const i18n_zh_CN: I18NConfig = {
  /** 核心库依赖，不可缺少 */
  editor: {
    noSelection: '请先选择插入资源位置！',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    selectAll: '全选',
    insertParagraphAfter: '在后面插入段落',
    insertParagraphBefore: '在前面插入段落',
    input: {
      canNotAccessClipboard: '无法访问剪切板！'
    },
    noUploader: '你没有在编辑器的配置项中添加 uploader 方法！',
  },
  /** 核心库依赖结束 */
  /** 以下配置，可根据自己的组件及插件配置添加或删除 */
  plugins: {
    toolbar: {
      audioTool: {
        tooltip: '音频',
        view: {
          title: '音频设置',
          addressLabel: '音频链接地址',
          addressPlaceholder: '请输入链接地址',
          uploadBtnText: '上传新音频',
          errorMessage: '必填项不能为空',
          switchLabel: '自动播放',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      },
      blockBackgroundColorTool: {
        tooltip: '块背景颜色',
        view: {
          btnText: '确定'
        }
      },
      blockMarginTool: {
        label: '块外边距',
        tooltip: '块外边距',
        view: {
          topLabel: '上边距',
          topPlaceholder: '请输入上边距',
          rightLabel: '右边距',
          rightPlaceholder: '请输入右边距',
          bottomLabel: '下边距',
          bottomPlaceholder: '请输入下边距',
          leftLabel: '左边距',
          leftPlaceholder: '请输入左边距',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      },
      blockPaddingTool: {
        label: '块内边距',
        tooltip: '块内边距',
        view: {
          topLabel: '上边距',
          topPlaceholder: '请输入上边距',
          rightLabel: '右边距',
          rightPlaceholder: '请输入右边距',
          bottomLabel: '下边距',
          bottomPlaceholder: '请输入下边距',
          leftLabel: '左边距',
          leftPlaceholder: '请输入左边距',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      },
      blockquoteTool: {
        tooltip: '引用'
      },
      formatPainterTool: {
        tooltip: '格式刷'
      },
      boldTool: {
        tooltip: '加粗'
      },
      cleanTool: {
        tooltip: '清除格式'
      },
      codeTool: {
        tooltip: '代码'
      },
      colorTool: {
        tooltip: '文字颜色',
        view: {
          btnText: '确定',
          recentText: '最近使用',
          backText: '返回',
          paletteText: '调色盘'
        }
      },
      emojiTool: {
        tooltip: '表情'
      },
      findTool: {
        tooltip: '查找与替换',
        view: {
          findLabel: '查找',
          findPlaceholder: '请输入查找内容',
          nextBtnText: '下一个',
          replaceLabel: '替换',
          replacePlaceholder: '替换成',
          replaceBtnText: '替换',
          replaceAllBtnText: '全部替换'
        }
      },
      fontFamilyTool: {
        tooltip: '字体',
        defaultFamilyText: '默认字体'
      },
      fontSizeTool: {
        tooltip: '字体大小',
        defaultSizeText: '默认'
      },
      headingTool: {
        tooltip: '段落与标题',
        h1: '标题1',
        h2: '标题2',
        h3: '标题3',
        h4: '标题4',
        h5: '标题5',
        h6: '标题6',
        div: 'div',
        paragraph: '正文',
      },
      historyBackTool: {
        tooltip: '撤销'
      },
      historyForwardTool: {
        tooltip: '重做'
      },
      imageTool: {
        tooltip: '图片',
        view: {
          linkLabel: '图片链接地址',
          linkInputPlaceholder: '请输入链接地址',
          uploadLabel: '上传图片',
          uploadBtnText: ' 点击上传',
          confirmBtnText: '确定',
        }
      },
      inlineMarginTool: {
        label: '外边距',
        tooltip: '外边距',
        view: {
          topLabel: '上边距',
          topPlaceholder: '请输入上边距',
          rightLabel: '右边距',
          rightPlaceholder: '请输入右边距',
          bottomLabel: '下边距',
          bottomPlaceholder: '请输入下边距',
          leftLabel: '左边距',
          leftPlaceholder: '请输入左边距',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      },
      inlinePaddingTool: {
        label: '内边距',
        tooltip: '内边距',
        view: {
          topLabel: '上边距',
          topPlaceholder: '请输入上边距',
          rightLabel: '右边距',
          rightPlaceholder: '请输入右边距',
          bottomLabel: '下边距',
          bottomPlaceholder: '请输入下边距',
          leftLabel: '左边距',
          leftPlaceholder: '请输入左边距',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      },
      insertObjectTool: {
        sourceCode: '源代码',
        lineHeight: '行高',
        letterSpacing: '字间距',
        blockBackgroundColor: '区块背景颜色',
        emoji: '表情',
        audio: '音频...',
        video: '视频...',
        subscript: '下标',
        superscript: '上标',
        code: 'Code',
        blockquote: '引用',
        leftToRight: '从左向右',
        rightToLeft: '从右向左'
      },
      insertParagraphAfterTool: {
        tooltip: '在后面插入段落'
      },
      insertParagraphBeforeTool: {
        tooltip: '在前面插入段落'
      },
      italicTool: {
        tooltip: '斜体'
      },
      leftToRightTool: {
        tooltip: '从左向右'
      },
      letterSpacingTool: {
        tooltip: '字间距',
        defaultValueLabel: '默认'
      },
      lineHeightTool: {
        tooltip: '行高',
        defaultValueLabel: '默认'
      },
      linkTool: {
        tooltip: '超链接',
        view: {
          linkLabel: '跳转链接地址',
          linkInputPlaceholder: '请输入链接地址',
          jumpLabel: '跳转方式',
          jumpSelfLabel: '当前窗口',
          jumpBlankLabel: '新窗口',
          invalidMessage: '请输入正确的链接地址'
        }
      },
      olTool: {
        tooltip: '有序列表'
      },
      preTool: {
        tooltip: '代码块',
        defaultLang: '其它'
      },
      rightToLeftTool: {
        tooltip: '从右向左'
      },
      strikeThrough: {
        tooltip: '删除线'
      },
      subscript: {
        tooltip: '下标'
      },
      superscript: {
        tooltip: '上标'
      },
      tableTool: {
        tooltip: '表格',
        createTable: '创建表格',
        editTable: '编辑表格',
        cellBorderColor: '设置单元格边框颜色',
        deleteTable: '删除表格'
      },
      tableAddTool: {
        tooltip: '插入表格',
        view: {
          confirmBtnText: '确定',
          rowLabel: '表格行数',
          rowPlaceholder: '请输入表格行数',
          columnLabel: '表格列数',
          columnPlaceholder: '请输入表格列数',
          useTextbusStyleLabel: '使用 Textbus 样式'
        }
      },
      tableEditTool: {
        tooltip: '编辑表格',
        addColumnToLeft: '在左边添加列',
        addColumnToRight: '在右边添加列',
        insertRowBefore: '在前面添加行',
        insertRowAfter: '在后面添加行',
        deleteLeftColumn: '删除左边列',
        deleteRightColumn: '删除右边列',
        deletePrevRow: '删除前一行',
        deleteNextRow: '删除后一行',
        mergeCells: '合并单元格',
        splitCells: '取消合并单元格'
      },
      tableRemoveTool: {
        tooltip: '删除表格'
      },
      tdBorderColorTool: {
        tooltip: '表格边框颜色',
        view: {
          confirmBtnText: '确定'
        }
      },
      textAlignTool: {
        tooltip: '对齐方式',
        left: '左对齐',
        right: '右对齐',
        center: '居中对齐',
        justify: '分散对齐'
      },
      textBackgroundColorTool: {
        tooltip: '文字背景颜色',
        view: {
          btnText: '确定',
          recentText: '最近使用',
          backText: '返回',
          paletteText: '调色盘'
        }
      },
      textIndentTool: {
        tooltip: '首行缩进'
      },
      ulTool: {
        tooltip: '无序列表'
      },
      underlineTool: {
        tooltip: '下划线'
      },
      unlinkTool: {
        tooltip: '取消超链接'
      },
      verticalAlignTool: {
        tooltip: '垂直对齐方式',
        baseline: '基线对齐',
        super: '文本上标',
        sub: '文本下标',
        top: '顶端对齐',
        middle: '居中',
        bottom: '底端对齐',
        textTop: '字体顶端对齐',
        textBottom: '字体底端对齐'
      },
      videoTool: {
        tooltip: '视频',
        view: {
          title: '视频设置',
          confirmBtnText: '确定',
          cancelBtnText: '取消',
          linkLabel: '视频链接地址',
          linkInputPlaceholder: '请输入链接地址',
          uploadBtnText: '上传新视频',
          validateErrorMessage: '必填项不能为空',
          videoWidthLabel: '视频宽度',
          videoWidthInputPlaceholder: '支持任意 CSS 单位',
          videoHeightLabel: '视频高度',
          videoHeightInputPlaceholder: '支持任意 CSS 单位',
          autoplayLabel: '自动播放'
        }
      },
      componentsTool: {
        tooltip: '组件库',
      },
    },
    linkJump: {
      accessLink: '跳转'
    },
    pasteHandle: {
      title: '资源上传',
      confirmBtnText: '确定',
      cancelBtnText: '完成',
      uploadBtnText: '上传',
      imageLabel: '第 {0} 张图片',
      videoLabel: '第 {0} 个视频',
      audioLabel: '第 {0} 个音频',
      imagePlaceholder: '请输入图片地址',
      videoPlaceholder: '请输入视频地址',
      audioPlaceholder: '请输入音频地址',
    }
  },
  components: {
    imageComponent: {
      contextMenu: {
        title: '图片设置',
        linkLabel: '图片链接地址',
        linkInputPlaceholder: '请输入链接地址',
        uploadBtnText: '上传',
        validateErrorMessage: '必填项不能为空',
        sizeSetter: {
          label: '宽高设置',
          widthPlaceholder: '宽度',
          heightPlaceholder: '高度'
        },
        maxSizeSetter: {
          label: '最大尺寸',
          widthPlaceholder: '宽度',
          heightPlaceholder: '高度'
        },
        float: {
          label: '浮动设置',
          noFloatLabel: '不浮动',
          floatToLeftLabel: '到左边',
          floatToRightLabel: '到右边'
        },
        marginLabel: '边距设置',
        confirmBtnText: '确定',
        cancelBtnText: '取消'
      }
    },
    tableComponent: {
      addColumnToLeft: '在左边添加列',
      addColumnToRight: '在右边添加列',
      insertRowBefore: '在前面添加行',
      insertRowAfter: '在后面添加行',
      deleteColumns: '删除列',
      deleteRows: '删除行',
      mergeCells: '合并单元格',
      splitCells: '拆分单元格',
      contextMenuLabel: '表格',
      contextMenuRemoveTable: '删除表格'
    },
    preComponent: {
      defaultLang: '其它',
      contextMenuLabel: '切换代码块语言',
      changeTheme: '切换代码块主题',
      emphasize: '强调',
      cancelEmphasize: '取消强调',
      lineNumber: '行号'
    },
    alertComponent: {
      creator: {
        name: '警告框'
      },
      contextMenu: {
        fill: '填充警告框',
        noFill: '取消填充警告框',
        type: '警告框风格',
      }
    },
    imageCardComponent: {
      creator: {
        name: '卡片'
      },
      setting: {
        title: '卡片设置',
        srcLabel: '图片地址',
        srcPlaceholder: '请输入图片地址',
        heightLabel: '图片高度',
        heightPlaceholder: '请输入图片高度',
        confirmBtnText: '确定',
        cancelBtnText: '取消',
      }
    },
    jumbotronComponent: {
      settingBtn: '设置',
      creator: {
        name: '巨幕'
      },
      setting: {
        name: '巨幕',
        form: {
          title: '巨幕设置',
          confirmBtnText: '确定',
          cancelBtnText: '取消',
          minHeightLabel: '巨幕最小高度',
          minHeightInputPlaceholder: '请输入巨幕最小高度',
          backgroundImageLabel: '背景图片地址',
          backgroundImageInputPlaceholder: '请输入背景图片地址',
          uploadBtnText: '上传新图片',
          validateErrorMessage: '必填项不能为空'
        }
      }
    },
    katexComponent: {
      creator: {
        name: '数学公式'
      },
      setter: {
        title: '数学公式设置',
        label: '源代码',
        placeholder: '请输入代码',
        confirmBtnText: '确定',
        cancelBtnText: '取消'
      }
    },
    stepsComponent: {
      creator: {
        name: '步骤条'
      }
    },
    timelineComponent: {
      creator: {
        name: '时间轴'
      }
    },
    todoListComponent: {
      creator: {
        name: '待办事项列表'
      }
    },
    wordExplainComponent: {
      creator: {
        name: '名词释义'
      },
      setter: {
        title: '名词释义设置',
        confirmBtnText: '确定',
        cancelBtnText: '取消',
        widthInputPlaceholder: '请输入标题宽度',
        widthLabel: '标题宽度'
      }
    }
  }
}
