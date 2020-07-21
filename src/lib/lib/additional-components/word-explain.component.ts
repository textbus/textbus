import {
  BackboneComponent,
  ComponentReader,
  EventType,
  FormatAbstractData,
  FormatEffect,
  Fragment,
  TBSelection,
  VElement,
  ViewData
} from '../core/_api';
import { BrComponent } from '../components/br.component';
import { ComponentExample } from '../workbench/component-stage';
import { textAlignFormatter } from '../formatter/block-style.formatter';

export interface WordExplainParams {
  title: Fragment;
  subtitle: Fragment;
  detail: Fragment;
}

export class WordExplainComponentReader implements ComponentReader {
  match(element: Element): boolean {
    return element.nodeName.toLowerCase() === 'tb-word-explain';
  }

  from(element: Element): ViewData {
    const title = element.querySelector('.tb-word-explain-title');
    const subtitle = element.querySelector('.tb-word-explain-subtitle');
    const detail = element.querySelector('.tb-word-explain-detail');

    const titleFragment = new Fragment();
    const subtitleFragment = new Fragment();
    const detailFragment = new Fragment();

    const component = new WordExplainComponent({
      title: titleFragment,
      subtitle: subtitleFragment,
      detail: detailFragment
    });
    return {
      component,
      slotsMap: [{
        from: title as HTMLElement,
        toSlot: titleFragment
      }, {
        from: subtitle as HTMLElement,
        toSlot: subtitleFragment
      }, {
        from: detail as HTMLElement,
        toSlot: detailFragment
      }]
    };
  }
}

export class WordExplainComponent extends BackboneComponent {
  private readonly title: Fragment;
  private readonly subtitle: Fragment;
  private readonly detail: Fragment;

  private wrapper: VElement;

  constructor(private params: WordExplainParams) {
    super('tb-word-explain');

    this.title = params.title;
    this.subtitle = params.subtitle;
    this.detail = params.detail;

    this.slots = [this.title, this.subtitle, this.detail];
  }

  canDelete(): boolean {
    return false;
  }

  clone(): WordExplainComponent {
    return new WordExplainComponent({
      title: this.params.title.clone(),
      subtitle: this.params.subtitle.clone(),
      detail: this.params.detail.clone()
    });
  }

  render(isProduction: boolean): VElement {
    const wrap = new VElement('tb-word-explain');
    this.wrapper = wrap;
    this.slots.forEach(f => {
      if (f.contentLength === 0) {
        f.append(new BrComponent());
      }
    })
    const titleGroup = new VElement('div');
    titleGroup.classes.push('tb-word-explain-title-group');
    wrap.appendChild(titleGroup);

    const title = new VElement('h3');
    title.classes.push('tb-word-explain-title');
    titleGroup.appendChild(title);

    const subtitle = new VElement('div');
    subtitle.classes.push('tb-word-explain-subtitle');
    titleGroup.appendChild(subtitle);

    const detail = new VElement('div');
    detail.classes.push('tb-word-explain-detail');
    wrap.appendChild(detail);

    this.viewMap.set(this.title, title);
    this.viewMap.set(this.subtitle, subtitle);
    this.viewMap.set(this.detail, detail);
    if (!isProduction) {
      const close = new VElement('span');
      close.classes.push('tb-word-explain-close');
      wrap.appendChild(close);
      let selection: TBSelection;
      close.events.subscribe(event => {
        if (event.selection) {
          selection = event.selection;
        }
        if (event.type === EventType.onRendered) {
          const closeBtn = event.renderer.getNativeNodeByVDom(close);
          closeBtn.addEventListener('click', () => {
            const parentFragment = event.renderer.getParentFragment(this);
            parentFragment.remove(parentFragment.indexOf(this), 1);
            event.renderer.dispatchEvent(this.wrapper, EventType.onContentUnexpectedlyChanged, selection);
          })
        }
      })
    }

    return wrap;
  }
}

export const wordExplainComponentExample: ComponentExample = {
  name: '词语释义',
  example: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#eee" height="18" width="90" rx="2" x="5" y="6"/><line x1="26" y1="9" x2="26" y2="20.5" stroke="#000" stroke-dasharray="0.8 0.8" stroke-width="0.1"></line><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="14" stroke-width="0" stroke="#000" fill="#000000">词语</text><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="12" y="20" stroke-width="0" stroke="#000" fill="#000000">说明</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="30" y="14" stroke-width="0" stroke="#000" fill="#000000">详细解释...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 20)"></use><use xlink:href="#item" transform="translate(0, 40)"></use></svg>')}">`,
  componentFactory() {
    const title = new Fragment();
    title.append('词语');
    title.apply(textAlignFormatter, {
      state: FormatEffect.Valid,
      abstractData: new FormatAbstractData({
        style: {
          name: 'textAlign',
          value: 'right'
        }
      })
    })

    const subtitle = new Fragment();
    subtitle.append('说明');
    subtitle.apply(textAlignFormatter, {
      state: FormatEffect.Valid,
      abstractData: new FormatAbstractData({
        style: {
          name: 'textAlign',
          value: 'right'
        }
      })
    })

    const detail = new Fragment();
    detail.append('详细解释');

    return new WordExplainComponent({
      title,
      subtitle,
      detail
    });
  }
}

export const wordExplainStyleSheet = `
tb-word-explain {
  display: flex;
  margin-top: 1em;
  margin-bottom: 1em;
  padding: 10px 20px;
  background-color: #f8f8f9;
  border-radius: 10px;
}
.tb-word-explain-title-group {
  width: 140px;
  padding-right: 20px;
}
.tb-word-explain-title {
  margin:0;
  font-size: inherit;
}
.tb-word-explain-subtitle {
  margin: 0;
  font-weight: 300;
  font-size: 0.9em;
}
.tb-word-explain-detail {
  flex: 1;
  padding-left: 20px;
  border-left: 1px dashed #ddd;
}
`;

export const wordExplainComponentEditingStyleSheet = `
tb-word-explain {
  position: relative;
}
tb-word-explain:hover .tb-word-explain-close {
  display: block;
}
.tb-word-explain-close {
  display: none;
  position: absolute;
  right: 10px;
  top: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.tb-word-explain-close:hover {
  transform: scale(1.2);
}
.tb-word-explain-close:before {
  content: "\u00d7";
}
`;
