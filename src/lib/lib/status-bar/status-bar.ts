import { Paths } from './paths';
import { Device } from './device';
import { FullScreen } from './full-screen';
import { EditingModel } from './editing-model';
import { LibSwitch } from './lib-switch';

export class StatusBar {
  elementRef = document.createElement('div');
  paths = new Paths();
  device = new Device();
  fullScreen = new FullScreen();
  editingModel = new EditingModel();
  libSwitch = new LibSwitch()

  constructor() {
    this.elementRef.classList.add('textbus-status-bar');
    this.elementRef.append(
      this.paths.elementRef,
      this.device.elementRef,
      this.editingModel.elementRef,
      this.fullScreen.elementRef,
      this.libSwitch.elementRef
    );
  }
}
