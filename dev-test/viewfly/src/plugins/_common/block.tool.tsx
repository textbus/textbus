import { withScopedCSS } from '@viewfly/scoped-css'

import css from './block-tool.scoped.scss'
import { MenuItem } from '../../components/menu-item/menu-item'
import { Button } from '../../components/button/button'
import { Dropdown } from '../../components/dropdown/dropdown'
import { Divider } from '../../components/divider/divider'
import { useActiveBlock } from '../hooks/active-block'
import { useBlockTransform } from '../hooks/block-transform'
import { Keymap } from '../../components/keymap/keymap'

export function BlockTool() {
  const checkStates = useActiveBlock()
  const transform = useBlockTransform()

  return withScopedCSS(css, () => {
    const states = checkStates()
    const types: [boolean, string][] = [
      [states.paragraph, 'xnote-icon-pilcrow'],
      [states.h1, 'xnote-icon-heading-h1'],
      [states.h2, 'xnote-icon-heading-h2'],
      [states.h3, 'xnote-icon-heading-h3'],
      [states.h4, 'xnote-icon-heading-h4'],
      [states.h5, 'xnote-icon-heading-h5'],
      [states.h6, 'xnote-icon-heading-h6'],
      [states.orderedList, 'xnote-icon-list-numbered'],
      [states.unorderedList, 'xnote-icon-list'],
      [states.todolist, 'xnote-icon-checkbox-checked'],
      [states.blockquote, 'xnote-icon-quotes-right'],
      [states.sourceCode, 'xnote-icon-source-code'],
      [states.highlightBox, 'xnote-icon-highlight-box'],
    ]

    let currentType = 'xnote-icon-pilcrow'

    for (const t of types) {
      if (t[0]) {
        currentType = t[1]
        break
      }
    }

    return (
      <Dropdown width={'auto'} onCheck={transform} trigger={'hover'} menu={[
        {
          label: <MenuItem icon={<span class="xnote-icon-pilcrow"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '0'
          }}/>} checked={states.paragraph}>正文</MenuItem>,
          value: 'paragraph'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-heading-h1"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '1'
          }}/>} checked={states.h1}>一级标题</MenuItem>,
          value: 'h1'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-heading-h2"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '2'
          }}/>} checked={states.h2}>二级标题</MenuItem>,
          value: 'h2'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-heading-h3"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '3'
          }}/>} checked={states.h3}>三级标题</MenuItem>,
          value: 'h3'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-heading-h4"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '4'
          }}/>} checked={states.h4}>四级标题</MenuItem>,
          value: 'h4'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-heading-h5"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '5'
          }}/>} checked={states.h5}>五级标题</MenuItem>,
          value: 'h5'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-heading-h6"/>} desc={<Keymap keymap={{
            modKey: true,
            key: '6'
          }}/>} checked={states.h6}>六级标题</MenuItem>,
          value: 'h6'
        }, {
          label: <Divider/>,
          value: ''
        }, {
          label: <MenuItem icon={<span class="xnote-icon-checkbox-checked"/>} checked={states.todolist}>待办事项</MenuItem>,
          value: 'todolist'
        }, {
          label: <MenuItem desc={<Keymap keymap={{ key: 'O', shiftKey: true, modKey: true }}/>}
                           icon={<span class="xnote-icon-list-numbered"></span>} checked={states.orderedList}>有序列表</MenuItem>,
          value: 'ol'
        }, {
          label: <MenuItem desc={<Keymap keymap={{ key: 'U', shiftKey: true, modKey: true }}/>} icon={<span class="xnote-icon-list"/>}
                           checked={states.unorderedList}>无序列表</MenuItem>,
          value: 'ul'
        }, {
          label: <MenuItem desc={<Keymap keymap={{ key: '\'', modKey: true }}/>} icon={<span class="xnote-icon-quotes-right"/>}
                           checked={states.blockquote}>引用</MenuItem>,
          value: 'blockquote'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-source-code"/>} checked={states.sourceCode}>代码块</MenuItem>,
          value: 'sourceCode'
        }, {
          label: <MenuItem icon={<span class="xnote-icon-hightlight-box"/>} checked={states.highlightBox}>高亮块</MenuItem>,
          value: 'highlightBox'
        }
      ]}>
        <Button arrow={true} highlight={false}><span class={currentType}/></Button>
      </Dropdown>
    )
  })
}
