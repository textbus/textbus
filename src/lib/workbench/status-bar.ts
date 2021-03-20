import { Injectable } from '@tanbo/di';

import { Device } from './device';
import { FullScreen } from './full-screen';
import { LibSwitch } from './lib-switch';
import { createElement } from '../uikit/uikit';

@Injectable()
export class StatusBar {
  elementRef = document.createElement('div');

  constructor(device: Device,
              fullScreen: FullScreen,
              libSwitch: LibSwitch) {
    this.elementRef.classList.add('textbus-status-bar');
    this.elementRef.append(
      createElement('div', {
        classes: ['textbus-status-bar-left'],
        children: [
          fullScreen.elementRef,
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
