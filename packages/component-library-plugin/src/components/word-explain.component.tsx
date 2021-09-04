import {
  Injectable,
  BackboneAbstractComponent, Component, ComponentControlPanelView,
  ComponentLoader, ComponentSetter,
  FormatData,
  FormatEffect,
  Fragment, SingleSlotRenderFn, SlotRenderFn,
  VElement,
  ViewData, I18n
} from '@textbus/core';
import { textAlignFormatter } from '@textbus/formatters';
import { Form, FormTextField } from '@textbus/uikit';

import { ComponentCreator } from '../component-library.plugin';

export interface WordExplainParams {
  title: Fragment;
  subtitle: Fragment;
  detail: Fragment;
}

class WordExplainComponentLoader implements ComponentLoader {
  match(element: Element): boolean {
    return element.nodeName.toLowerCase() === 'tb-word-explain';
  }

  read(element: Element): ViewData {
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

    const width = (element.querySelector('.tb-word-explain-title-group') as HTMLElement).style.width;
    if (width) {
      component.width = width;
    }
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

@Injectable()
export class WordExplainComponentSetter implements ComponentSetter<WordExplainComponent> {
  constructor(private i18n: I18n) {
  }

  create(instance: WordExplainComponent): ComponentControlPanelView {
    const childI18n = this.i18n.getContext('components.wordExplainComponent.setter');
    const form = new Form({
      mini: true,
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          name: 'width',
          value: instance.width,
          placeholder: childI18n.get('widthInputPlaceholder'),
          label: childI18n.get('widthLabel')
        })
      ]
    })

    form.onComplete.subscribe(map => {
      instance.width = map.get('width');
      instance.markAsDirtied();
    });
    return {
      title: childI18n.get('title'),
      view: form.elementRef
    }
  }
}

@Component({
  loader: new WordExplainComponentLoader(),
  providers: [{
    provide: ComponentSetter,
    useClass: WordExplainComponentSetter
  }],
  styles: [
    `
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
@media screen and (max-width: 767px) {
  tb-word-explain {
    display: block;
  }
  .tb-word-explain-title-group {
    width: auto !important;
    padding-right: 0;
    display: flex;
    align-items: baseline;
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
    border-bottom: 1px dashed #ddd;
  }
  .tb-word-explain-subtitle {
    margin-left: 0.5em;
    font-weight: 300;
    font-size: 0.9em;
  }
  .tb-word-explain-detail {
    padding-left: 0;
    border-left: none;
  }
}
`
  ],
  editModeStyles: [
    `
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
`
  ]
})
export class WordExplainComponent extends BackboneAbstractComponent {
  width = '140px';
  private readonly title: Fragment;
  private readonly subtitle: Fragment;
  private readonly detail: Fragment;

  private emptyFragments: Fragment[] = [];

  constructor(private params: WordExplainParams) {
    super('tb-word-explain');

    this.title = params.title;
    this.subtitle = params.subtitle;
    this.detail = params.detail;

    this.clean();
    this.push(this.title, this.subtitle, this.detail);
  }

  canDelete(slot: Fragment): boolean {
    this.emptyFragments.push(slot);
    return [this.title, this.subtitle, this.detail].every(item => {
      return this.emptyFragments.includes(item);
    })
  }

  clone(): WordExplainComponent {
    return new WordExplainComponent({
      title: this.params.title.clone(),
      subtitle: this.params.subtitle.clone(),
      detail: this.params.detail.clone()
    });
  }

  slotRender(slot: Fragment, isOutputMode: boolean, slotRendererFn: SingleSlotRenderFn): VElement {
    this.emptyFragments = [];
    switch (slot) {
      case this.title:
        return slotRendererFn(slot, <div class="tb-word-explain-title"/>);
      case this.subtitle:
        return slotRendererFn(slot, <div class="tb-word-explain-subtitle"/>);
      case this.detail:
        return slotRendererFn(slot, <div class="tb-word-explain-detail"/>);
    }
  }

  render(isOutputMode: boolean, slotRenderFn: SlotRenderFn): VElement {
    this.emptyFragments = [];
    return (
      <tb-word-explain>
        <div class="tb-word-explain-title-group" style={{width: this.width}}>
          {slotRenderFn(this.title)}
          {slotRenderFn(this.subtitle)}
        </div>
        {slotRenderFn(this.detail)}
        {
          !isOutputMode && <span class="tb-word-explain-close" onClick={() => {
            const parentFragment = this.parentFragment;
            const index = parentFragment.indexOf(this);
            parentFragment.remove(index, index + 1);
          }
          }/>
        }
      </tb-word-explain>
    );
  }
}

export const wordExplainComponentExample: ComponentCreator = {
  name: i18n => i18n.get('components.wordExplainComponent.creator.name'),
  category: 'TextBus',
  example: `<img alt="示例" src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg width="100" height="70" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g><rect fill="#fff" height="100%" width="100%"/></g><defs><g id="item"><rect fill="#eee" height="18" width="90" rx="2" x="5" y="6"/><line x1="26" y1="9" x2="26" y2="20.5" stroke="#000" stroke-dasharray="0.8 0.8" stroke-width="0.1"></line><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="10" y="14" stroke-width="0" stroke="#000" fill="#000000">名词</text><text font-family="Helvetica, Arial, sans-serif" font-size="5" x="12" y="20" stroke-width="0" stroke="#000" fill="#000000">说明</text><text font-family="Helvetica, Arial, sans-serif" font-size="6" x="30" y="14" stroke-width="0" stroke="#000" fill="#000000">详细解释...</text></g></defs><use xlink:href="#item"></use><use xlink:href="#item" transform="translate(0, 20)"></use><use xlink:href="#item" transform="translate(0, 40)"></use></svg>')}">`,
  factory() {
    const title = new Fragment();
    title.append('名词');
    title.apply(textAlignFormatter, {
      effect: FormatEffect.Valid,
      formatData: new FormatData({
        styles: {
          textAlign: 'right'
        }
      })
    })

    const subtitle = new Fragment();
    subtitle.append('说明');
    subtitle.apply(textAlignFormatter, {
      effect: FormatEffect.Valid,
      formatData: new FormatData({
        styles: {
          textAlign: 'right'
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
