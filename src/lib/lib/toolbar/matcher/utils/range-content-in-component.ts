import { BackboneComponent, BranchComponent, Constructor, Renderer, TBRange } from '../../../core/_api';

export function rangeContentInComponent(range: TBRange,
                                       renderer: Renderer,
                                       componentConstructorList: Array<Constructor<BackboneComponent | BranchComponent>> = []) {
  let has = true;
  if (componentConstructorList.length === 0) {
    return false;
  }
  forA: for (const t of componentConstructorList) {
    const scopes = range.getSuccessiveContents();
    for (const scope of scopes) {
      if (!renderer.getContext(scope.fragment, t)) {
        has = false;
        break forA;
      }
    }
  }
  return has;
}
