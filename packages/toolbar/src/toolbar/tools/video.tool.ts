import { Form, FormHidden, FormSwitch, FormTextField } from '@textbus/uikit';
import { VideoComponent, PreComponent } from '@textbus/components';

import { VideoCommander } from '../commands/video.commander';
import { LeafComponentMatcher } from '../matcher/leaf-component.matcher';
import { FormTool, FormToolConfig } from '../toolkit/_api';

export const videoToolConfig: FormToolConfig = {
  iconClasses: ['textbus-icon-video'],
  tooltip: i18n => i18n.get('plugins.toolbar.videoTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.videoTool.view');
    return new Form({
      title: childI18n.get('title'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      cancelBtnText: childI18n.get('cancelBtnText'),
      items: [
        new FormTextField({
          label: childI18n.get('linkLabel'),
          name: 'src',
          placeholder: childI18n.get('linkInputPlaceholder'),
          canUpload: true,
          uploadType: 'video',
          uploadBtnText: childI18n.get('uploadBtnText'),
          validateFn(value: string): string | null {
            if (!value) {
              return childI18n.get('validateErrorMessage');
            }
            return null;
          }
        }),
        new FormHidden({
          name: 'controls',
          value: 'controls'
        }),
        new FormTextField({
          label: childI18n.get('videoWidthLabel'),
          name: 'width',
          placeholder: childI18n.get('videoWidthInputPlaceholder'),
          value: '100%'
        }),
        new FormTextField({
          label: childI18n.get('videoHeightLabel'),
          name: 'height',
          placeholder: childI18n.get('videoHeightInputPlaceholder'),
          value: 'auto'
        }),
        new FormSwitch({
          label: childI18n.get('autoplayLabel'),
          checked: false,
          name: 'autoplay'
        })
      ]
    });
  },
  matcher: new LeafComponentMatcher(VideoComponent, 'video', [PreComponent]),
  commanderFactory() {
    return new VideoCommander();
  }
};
export const videoTool = new FormTool(videoToolConfig);
