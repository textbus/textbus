import { Paths } from './paths';
import { Device } from './device';
import { FullScreen } from './full-screen';
import { EditingMode } from './editing-mode';
import { LibSwitch } from './lib-switch';

export class StatusBar {
  elementRef = document.createElement('div');
  paths = new Paths();
  device = new Device();
  fullScreen = new FullScreen();
  editingMode = new EditingMode();
  libSwitch = new LibSwitch()

  constructor() {
    this.elementRef.classList.add('textbus-status-bar');
    this.elementRef.append(
      this.paths.elementRef,
      this.device.elementRef,
      this.editingMode.elementRef,
      this.fullScreen.elementRef,
      this.libSwitch.elementRef
    );
  }
}
