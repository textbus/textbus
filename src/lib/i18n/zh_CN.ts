import { I18NConfig } from '../i18n';

export const i18n_zh_CN: I18NConfig = {
  // 核心库依赖，不可缺少
  editor: {
    noSelection: '请先选择插入资源位置！',
    insertParagraphAfter: '在后面插入段落',
    insertParagraphBefore: '在前面插入段落',
    copy: '复制',
    paste: '粘贴',
    cut: '剪切',
    selectAll: '全选'
  },
  plugins: {
    // 核心库依赖，不可缺少
    controlPanel: {
      cancelFixed: '取消固定',
      fixed: '固定'
    },
    // 核心库依赖，不可缺少
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
    toolbar: {}
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
