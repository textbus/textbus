import { I18NConfig } from '../i18n';

export const i18n_zh_CN: I18NConfig = {
  /** 核心库依赖，不可缺少 */
  editor: {
    noSelection: '请先选择插入资源位置！',
    insertParagraphAfter: '在后面插入段落',
    insertParagraphBefore: '在前面插入段落',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    selectAll: '全选',
    controlPanel: {
      cancelFixed: '取消固定',
      fixed: '固定'
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
  /** 核心库依赖结束 */
  /** 以下配置，可根据自己的组件及插件配置添加或删除 */
  plugins: {
    componentStage: {
      switchText: '组件库',
      expandOrNarrowLib: '展开或收起组件库',
      defaultCategoryName: '默认'
    },
    device: {
      title: '切换设备宽度',
      unknownDeviceText: '未知设备'
    },
    fullScreen: {
      switchFullScreen: '切换全屏模式'
    },
    linkJump: {
      accessLink: '跳转'
    },
    outlines: {
      title: '概览',
      switchText: '概览'
    },
    sourcecodeMode: {
      switchText: '源代码'
    },
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
          btnText: '确定'
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
          title: '图片设置',
          linkLabel: '图片链接地址',
          linkInputPlaceholder: '请输入链接地址',
          uploadBtnText: '上传新图片',
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
    }
  },
  components: {
    tableComponent: {
      addColumnToLeft: '在左边添加列',
      addColumnToRight: '在右边添加列',
      insertRowBefore: '在前面添加行',
      insertRowAfter: '在后面添加行',
      deleteLeftColumn: '删除左边列',
      deleteRightColumn: '删除右边列',
      deletePrevRow: '删除前一行',
      deleteNextRow: '删除后一行',
      mergeCells: '合并单元格',
      splitCells: '拆分单元格'
    }
  }
}
