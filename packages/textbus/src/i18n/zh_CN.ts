import { I18NConfig } from '@textbus/core';
import { i18n_zh_CN__toolbar } from '@textbus/toolbar'

export const i18n_zh_CN: I18NConfig = {
  /** 核心库依赖，不可缺少 */
  editor: {
    noSelection: '请先选择插入资源位置！',
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
  plugins: {
    toolbar: i18n_zh_CN__toolbar,
    componentStage: {
      switchText: '组件库',
      expandOrNarrowLib: '展开或收起组件库',
      defaultCategoryName: '默认'
    },
    contextmenu: {
      insertParagraphAfter: '在后面插入段落',
      insertParagraphBefore: '在前面插入段落',
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
    localBackup: {
      title: '本地缓存',
      confirmBtnText: '确定',
      cancelBtnText: '取消',
      tooltip: '检测到有本地缓存，是否应用？'
    },
    outlines: {
      title: '概览',
      switchText: '概览'
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
    },
    sourcecodeMode: {
      switchText: '源代码'
    },
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
    },
    alertComponent: {
      creator: {
        name: '警告框'
      },
      setter: {
        title: '警告框设置',
        typeLabel: '类型',
        fillLabel: '是否填充',
        confirmBtnText: '确定'
      }
    },
    baiduMapComponent: {
      creator: {
        name: '百度地图',
        form: {
          placeholder: '请输入地址',
          searchBtnText: '搜索',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      }
    },
    imageCardComponent: {
      creator: {
        name: '卡片'
      }
    },
    jumbotronComponent: {
      creator: {
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
      },
      setter: {
        title: '巨幕设置',
        confirmBtnText: '确定',
        minHeightLabel: '巨幕最小高度',
        minHeightInputPlaceholder: '请输入巨幕最小高度',
        backgroundImageLabel: '背景图片地址',
        backgroundImageInputPlaceholder: '请输入背景图片地址',
        uploadBtnText: '上传新图片',
        validateErrorMessage: '必填项不能为空'
      }
    },
    katexComponent: {
      creator: {
        name: '数学公式',
        form: {
          title: '数学公式设置',
          label: '源代码',
          placeholder: '请输入代码',
          confirmBtnText: '确定',
          cancelBtnText: '取消'
        }
      },
      setter: {
        title: '数学公式设置',
        confirmBtnText: '确定',
        placeholder: '请输入代码'
      }
    },
    progressComponent: {
      creator: {
        name: '进度条',
        form: {
          title: '进度条',
          confirmBtnText: '确定',
          cancelBtnText: '取消',
          max: {
            label: '最大值',
            placeholder: '请输入最大值',
            validateErrorMessage: '必填项不能为空'
          },
          min: {
            label: '最小值',
            placeholder: '请输入最小值',
            validateErrorMessage: '必填项不能为空'
          },
          progress: {
            label: '当前进度',
            placeholder: '请输入当前进度',
            validateErrorMessage: '必填项不能为空'
          },
          type: {
            label: '进度条类型',
            validateErrorMessage: '必选项不能为空'
          }
        }
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
        widthInputPlaceholder: '请输入标题宽度',
        widthLabel: '标题宽度'
      }
    }
  }
}
