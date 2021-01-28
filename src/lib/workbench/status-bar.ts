import { Injectable } from '@tanbo/di';

import { Device } from './device';
import { FullScreen } from './full-screen';
import { EditingMode } from './editing-mode';
import { LibSwitch } from './lib-switch';
import { createElement } from '../uikit/uikit';

/**
 * 状态栏类
 */
@Injectable()
export class StatusBar {
  elementRef = document.createElement('div');

  constructor(device: Device,
              fullScreen: FullScreen,
              editingMode: EditingMode,
              libSwitch: LibSwitch) {
    console.log('StatusBar');
    this.elementRef.classList.add('textbus-status-bar');
    this.elementRef.append(
      createElement('div', {
        classes: ['textbus-status-bar-left'],
        children: [
          fullScreen.elementRef,
          editingMode.elementRef,
          device.elementRef,
        ]
      }),
      libSwitch.elementRef
    );
  }

  destroy() {
    //
  }
}
