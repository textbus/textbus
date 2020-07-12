import { BackboneTemplate, BranchTemplate, Constructor, Renderer, TBRange } from '../../../core/_api';

export function rangeContentInTemplate(range: TBRange,
                                       renderer: Renderer,
                                       templateConstructorList: Array<Constructor<BackboneTemplate | BranchTemplate>> = []) {
  let has = true;
  if (templateConstructorList.length === 0) {
    return false;
  }
  forA: for (const t of templateConstructorList) {
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
