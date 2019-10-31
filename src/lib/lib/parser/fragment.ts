import { Contents, Sliceable } from './contents';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VirtualDom } from './virtual-dom';

export class StyleRange {
  get length() {
    return this.endIndex - this.startIndex || 0;
  }

  constructor(public startIndex: number,
              public endIndex: number,
              public state: MatchState,
              public handler: Handler,
              public context: Fragment) {
  }

  clone() {
    return new StyleRange(this.startIndex, this.endIndex, this.state, this.handler, this.context);
  }
}

export class Fragment implements Sliceable {
  get length() {
    return this.contents.length;
  }

  contents = new Contents();
  styleMatrix = new Map<Handler, StyleRange[]>();

  // private oldAty
  constructor(public tagName = 'p') {
  }

  ast(tagName?: string): Array<Array<VirtualDom>|VirtualDom> {
    let styles: StyleRange[] = [];
    this.styleMatrix.forEach(value => {
      styles = styles.concat(value);
    });
    const canApplyStyles = styles.sort((n, m) => {
      const a = n.startIndex - m.startIndex;
      if (a === 0) {
        return m.endIndex - n.endIndex;
      }
      return a;
    }).map(item => item.clone());

    const vDomList: VirtualDom[] = [];
    const depthVDomList: VirtualDom[] = [];

    for (let i = 0; i < canApplyStyles.length; i++) {
      const item = canApplyStyles[i];
      let lastVDom = depthVDomList[depthVDomList.length - 1];
      if (lastVDom) {
        if (item.startIndex < lastVDom.styleRange.endIndex) {
          const newStyleRange = item.clone();
          if (lastVDom.styleRange.endIndex < newStyleRange.endIndex) {
            newStyleRange.endIndex = lastVDom.styleRange.endIndex;
            const c = item.clone();
            c.startIndex = newStyleRange.endIndex;
            canApplyStyles[i] = c;
            i--;
          }
          const newNode = new VirtualDom(newStyleRange);
          lastVDom.children.push(newNode);
          depthVDomList.push(newNode);
        } else {
          depthVDomList.pop();
          const newNode = new VirtualDom(item);
          vDomList.push(newNode);
          depthVDomList.push(newNode);
        }
      } else {
        const newNode = new VirtualDom(item);
        vDomList.push(newNode);
        depthVDomList.push(newNode);
      }
    }

    console.log(vDomList);
    // return this.builder(canApplyStyles, 0);
    //
    let index = 0;
    for (const item of this.contents) {
      if (typeof item === 'string') {
        // canApplyStyles.filter(item => {
        //   return item.startIndex >= index && item.endIndex <= index + item.length;
        // });

      } else if (item instanceof Fragment) {
        item.ast();
      }
      index += item.length;
    }
    //
    return vDomList;
  }

  slice(startIndex: number, endIndex: number): Sliceable {
    return this.contents.slice(startIndex, endIndex);
  }
}
