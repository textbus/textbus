import { inject } from '@viewfly/core'
import { Commander, Component, ContentType, Selection, Slot, Textbus } from '@textbus/core'
import { withScopedCSS } from '@viewfly/scoped-css'

import { ParagraphComponent } from '../../textbus/components/paragraph/paragraph.component'
import { Button } from '../../components/button/button'
import { Divider } from '../../components/divider/divider'
import { MenuItem } from '../../components/menu-item/menu-item'
import css from './insert-tool.scoped.scss'
import { headingAttr } from '../../textbus/attributes/heading.attr'
import { ListComponent } from '../../textbus/components/list/list.component'
import { SourceCodeComponent } from '../../textbus/components/source-code/source-code.component'
import { TableComponent } from '../../textbus/components/table/table.component'
import { TodolistComponent } from '../../textbus/components/todolist/todolist.component'
import { HighlightBoxComponent } from '../../textbus/components/highlight-box/highlight-box.component'
import { FileUploader } from '../../interfaces'
import { ImageComponent } from '../../textbus/components/image/image.component'
import { VideoComponent } from '../../textbus/components/video/video.component'
import { MenuHeading } from '../../components/menu-heading/menu-heading'
import { KatexComponent } from '../../textbus/components/katex/katex.component'
import { DropdownContextService } from '../../components/dropdown/dropdown-context.service'

export interface InsertToolProps {
  slot: Slot | null
  hideTitle?: boolean
  replace?: boolean
}

export function InsertTool(props: InsertToolProps) {
  const commander = inject(Commander)
  const selection = inject(Selection)
  const textbus = inject(Textbus)
  const fileUploader = inject(FileUploader, null)
  const dropdownContextService = inject(DropdownContextService)

  function insert(type: string) {
    const component = props.slot?.parent
    if (!component) {
      return
    }

    function insertComponent(comp: Component<any>) {
      if (props.replace) {
        commander.replaceComponent(component!, comp)
      } else {
        commander.insertAfter(comp, component!)
      }
      dropdownContextService.canHide = true
      dropdownContextService.hide(false)
    }

    switch (type) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'paragraph': {
        const slot = new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ])
        if (/h[1-6]/.test(type)) {
          slot.setAttribute(headingAttr, type)
        }
        const p = new ParagraphComponent(textbus, {
          slot
        })
        insertComponent(p)
        selection.setPosition(slot, 0)
      }
        break
      case 'ol':
      case 'ul': {
        const slot = new Slot([
          ContentType.InlineComponent,
          ContentType.Text
        ])
        const list = new ListComponent(textbus, {
          slot,
          reorder: true,
          type: type === 'ol' ? 'OrderedList' : 'UnorderedList'
        })
        insertComponent(list)
        selection.setPosition(slot, 0)
      }
        break
      case 'sourceCode': {
        const slot = new Slot([
          ContentType.Text
        ])
        const comp = new SourceCodeComponent(textbus, {
          lang: '',
          lineNumber: true,
          slots: [{
            slot,
            emphasize: false
          }]
        })
        insertComponent(comp)
        selection.setPosition(slot, 0)
      }
        break
      case 'table': {
        const table = new TableComponent(textbus)
        insertComponent(table)
        textbus.nextTick(() => {
          selection.selectFirstPosition(table, true, true)
        })
      }
        break
      case 'todolist': {
        const slot = new Slot([
          ContentType.Text,
          ContentType.InlineComponent
        ])
        const comp = new TodolistComponent(textbus, {
          slot,
          checked: false
        })
        insertComponent(comp)
        selection.setPosition(slot, 0)
      }
        break
      case 'image':
        if (fileUploader) {
          Promise.resolve().then(() => fileUploader.uploadFile('image')).then(url => {
            const img = new ImageComponent(textbus, {
              src: url
            })
            commander.insert(img)
          })
        }
        break
      case 'video':
        if (fileUploader) {
          Promise.resolve().then(() => fileUploader.uploadFile('video')).then(url => {
            const img = new VideoComponent(textbus, {
              src: url
            })
            commander.insert(img)
          })
        }
        break
      case 'highlightBox': {
        const p = new ParagraphComponent(textbus)
        const comp = new HighlightBoxComponent(textbus)
        comp.state.slot.insert(p)
        insertComponent(comp)
        selection.setPosition(p.state.slot, 0)
      }
        break
      case 'katex': {
        const p = new ParagraphComponent(textbus)
        const comp = new KatexComponent(textbus)
        p.state.slot.insert(comp)
        insertComponent(p)
        selection.selectComponent(comp)
      }
        break
    }
  }

  return withScopedCSS(css, () => {
    return <>
      {
        props.hideTitle ? null : <MenuHeading>{props.replace ? '替换为' : '在下面添加'}</MenuHeading>
      }
      <div class="btn-group">
        <Button ordinary={true} onClick={() => insert('paragraph')}>
          <span class="xnote-icon-pilcrow"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('h1')}>
          <span class="xnote-icon-heading-h1"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('h2')}>
          <span class="xnote-icon-heading-h2"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('h3')}>
          <span class="xnote-icon-heading-h3"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('h4')}>
          <span class="xnote-icon-heading-h4"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('h5')}>
          <span class="xnote-icon-heading-h5"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('h6')}>
          <span class="xnote-icon-heading-h6"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('ol')}>
          <span class="xnote-icon-list-numbered"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('ul')}>
          <span class="xnote-icon-list"/>
        </Button>
        <Button ordinary={true} onClick={() => insert('sourceCode')}>
          <span class="xnote-icon-source-code"/>
        </Button>
      </div>
      <Divider/>
      <MenuItem onClick={() => insert('table')} icon={<span class="xnote-icon-table"/>}>表格</MenuItem>
      <MenuItem onClick={() => insert('todolist')} icon={<span class="xnote-icon-checkbox-checked"/>}>待办列表</MenuItem>
      <MenuItem onClick={() => insert('image')} icon={<span class="xnote-icon-image"/>}>图片</MenuItem>
      <MenuItem onClick={() => insert('video')} icon={<span class="xnote-icon-video"/>}>视频</MenuItem>
      <MenuItem onClick={() => insert('highlightBox')} icon={<span class="xnote-icon-hightlight-box"/>}>高亮块</MenuItem>
      <MenuItem onClick={() => insert('katex')} icon={<span class="xnote-icon-function"/>}>数学公式</MenuItem>
    </>
  })
}
