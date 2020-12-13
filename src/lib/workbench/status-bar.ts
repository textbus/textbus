import { Injectable } from '@tanbo/di';

import { Device } from './device';
import { FullScreen } from './full-screen';
import { EditingMode } from './editing-mode';
import { LibSwitch } from './lib-switch';
import { createElement } from '../uikit/uikit';

@Injectable()
export class StatusBar {
  elementRef = document.createElement('div');

  constructor(device: Device,
              fullScreen: FullScreen,
              editingMode: EditingMode,
              libSwitch: LibSwitch) {
    this.elementRef.classList.add('textbus-status-bar');
    this.elementRef.append(
      createElement('div', {
        attrs: {
          style: 'flex: 1'
        }
      }),
      device.elementRef,
      editingMode.elementRef,
      fullScreen.elementRef,
      libSwitch.elementRef
    );
  }
}
