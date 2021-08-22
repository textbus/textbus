import { AudioComponent, PreComponent } from '@textbus/components';
import { Form, FormHidden, FormSwitch, FormTextField } from '@textbus/uikit';

import { AudioCommander } from '../commands/audio.commander';
import { LeafComponentMatcher } from '../matcher/leaf-component.matcher';
import { FormTool, FormToolConfig } from '../toolkit/_api';

export const audioToolConfig: FormToolConfig = {
  iconClasses: ['textbus-icon-music'],
  tooltip: i18n => i18n.get('plugins.toolbar.audioTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.audioTool.view');
    return new Form({
      title: childI18n.get('title'),
      cancelBtnText: childI18n.get('cancelBtnText'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          label: childI18n.get('addressLabel'),
          name: 'src',
          placeholder: childI18n.get('addressPlaceholder'),
          canUpload: true,
          uploadType: 'audio',
          uploadBtnText: childI18n.get('uploadBtnText'),
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('errorMessage');
            }
            return null;
          }
        }),
        new FormSwitch({
          label: childI18n.get('switchLabel'),
          checked: false,
          name: 'autoplay'
        }),
        new FormHidden({
          name: 'controls',
          value: 'controls'
        })
      ]
    });
  },
  matcher: new LeafComponentMatcher(AudioComponent, 'audio', [PreComponent]),
  commanderFactory() {
    return new AudioCommander();
  }
}
export const audioTool = new FormTool(audioToolConfig);
