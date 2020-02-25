export class Loading {
  elementRef = document.createElement('div');

  constructor() {
    this.elementRef.classList.add('tbus-loading');
  }
}
