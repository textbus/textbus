import { Lifecycle } from '../core/lifecycle';

export class LinkHook implements Lifecycle {
  onOutput(contents: string): string {
    const div = document.createElement('div');
    div.innerHTML = contents;
    div.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('data-href');
      if (href) {
        a.setAttribute('href', a.getAttribute('data-href'));
        a.removeAttribute('data-href');
      }
    });
    return div.innerHTML;
  }
}
