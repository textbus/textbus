export class Editor {
  readonly host = document.createElement('iframe');

  constructor() {
    this.host.classList.add('tanbo-editor');
  }
}
